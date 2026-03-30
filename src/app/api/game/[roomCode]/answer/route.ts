import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sql } from "@/lib/db";
import { calculateScore } from "@/lib/scoring";
import { ensureParsed } from "@/lib/parse";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
  const { roomCode } = await params;
  const { playerId, token, optionId } = await request.json();

  if (!playerId || !token || optionId === undefined) {
    return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
  }

  // Valider le token
  const playerRaw = await redis.hget(`room:${roomCode}:players`, playerId);
  if (!playerRaw) {
    return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
  }
  const player = ensureParsed<Record<string, unknown>>(playerRaw);
  if (player.token !== token) {
    return NextResponse.json({ error: "Token invalide" }, { status: 403 });
  }

  // Verifier l'etat du jeu
  const state = await redis.hgetall(`room:${roomCode}:state`);
  if (!state || state.status !== "playing") {
    return NextResponse.json({ error: "Pas de question en cours" }, { status: 409 });
  }

  // Verifier le deadline (serveur fait foi)
  const deadline = Number(state.questionDeadline);
  const now = Date.now();
  if (now > deadline) {
    return NextResponse.json({ error: "Temps ecoule" }, { status: 409 });
  }

  const qIndex = Number(state.currentQuestionIndex);

  // Enregistrer la reponse (atomique, empeche double-soumission)
  const wasSet = await redis.hsetnx(
    `room:${roomCode}:answers:${qIndex}`,
    playerId,
    JSON.stringify({ optionId, answeredAt: now })
  );

  if (!wasSet) {
    return NextResponse.json({ error: "Deja repondu" }, { status: 409 });
  }

  await redis.expire(`room:${roomCode}:answers:${qIndex}`, 7200);
  await redis.incr(`room:${roomCode}:version`);

  // Verifier si tous les joueurs ont repondu
  const playersRaw = await redis.hgetall(`room:${roomCode}:players`);
  const playerCount = playersRaw ? Object.keys(playersRaw).length : 0;
  const answersRaw = await redis.hgetall(`room:${roomCode}:answers:${qIndex}`);
  const answerCount = answersRaw ? Object.keys(answersRaw).length : 0;

  if (answerCount >= playerCount) {
    // Tous ont repondu -> resoudre la question
    await resolveQuestion(roomCode, qIndex, state);
  }

  return NextResponse.json({ accepted: true });
  } catch (err) {
    console.error("ANSWER ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

async function resolveQuestion(
  roomCode: string,
  qIndex: number,
  state: Record<string, unknown>
) {
  const questionIds: number[] = ensureParsed<number[]>(state.questionIds);
  const questionId = questionIds[qIndex];

  const qResult = await sql`
    SELECT correct_index, difficulty, time_limit FROM questions WHERE id = ${questionId}
  `;
  if (qResult.length === 0) return;

  const correctIndex = qResult[0].correct_index as number;
  const difficulty = qResult[0].difficulty as number;
  const timeLimit = (qResult[0].time_limit as number) * 1000;
  const questionStartedAt = Number(state.questionStartedAt);

  // Sauvegarder les rangs AVANT pour les animations
  const prevScoresRaw = await redis.zrange(`room:${roomCode}:scores`, 0, -1, { withScores: true, rev: true });
  const prevRanks: Record<string, number> = {};
  if (prevScoresRaw && Array.isArray(prevScoresRaw)) {
    let rank = 1;
    for (let i = 0; i < prevScoresRaw.length; i += 2) {
      prevRanks[prevScoresRaw[i] as string] = rank++;
    }
  }

  const answersRaw = await redis.hgetall(`room:${roomCode}:answers:${qIndex}`);
  if (!answersRaw) return;

  const pipeline = redis.pipeline();
  const pointsMap: Record<string, number> = {};

  for (const [pId, answerStr] of Object.entries(answersRaw)) {
    const answer = ensureParsed<{ optionId: number; answeredAt: number }>(answerStr);
    const isCorrect = answer.optionId === correctIndex;
    const elapsedMs = answer.answeredAt - questionStartedAt;
    const points = calculateScore(difficulty, isCorrect, elapsedMs, timeLimit);
    pointsMap[pId] = points;

    if (points > 0) {
      pipeline.zincrby(`room:${roomCode}:scores`, points, pId);
    }

    const playerRaw = await redis.hget(`room:${roomCode}:players`, pId);
    if (playerRaw) {
      const p = ensureParsed<Record<string, unknown>>(playerRaw);
      const newStreak = isCorrect ? (Number(p.streak) || 0) + 1 : 0;
      const newScore = (Number(p.score) || 0) + points;
      pipeline.hset(`room:${roomCode}:players`, {
        [pId]: JSON.stringify({ ...p, score: newScore, streak: newStreak }),
      });
    }
  }

  pipeline.set(`room:${roomCode}:prevRanks`, JSON.stringify(prevRanks), { ex: 300 });
  pipeline.set(`room:${roomCode}:pointsMap`, JSON.stringify(pointsMap), { ex: 300 });
  pipeline.hset(`room:${roomCode}:state`, { status: "reveal" });
  pipeline.incr(`room:${roomCode}:version`);

  await pipeline.exec();
}

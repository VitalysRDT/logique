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
    const { playerId, token, action } = await request.json();

    // Valider que c'est le host
    const state = await redis.hgetall(`room:${roomCode}:state`);
    if (!state || !state.roomCode) {
      return NextResponse.json({ error: "Room introuvable" }, { status: 404 });
    }

    const playerRaw = await redis.hget(`room:${roomCode}:players`, playerId);
    if (!playerRaw) {
      return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
    }
    const player = ensureParsed<Record<string, unknown>>(playerRaw);
    if (player.token !== token || playerId !== state.hostId) {
      return NextResponse.json({ error: `Non autorise: hostId=${state.hostId} playerId=${playerId} tokenMatch=${player.token === token}` }, { status: 403 });
    }

    switch (action) {
      case "start":
        return await handleStart(roomCode, state);
      case "begin":
        return await handleBegin(roomCode, state);
      case "next":
        return await handleNext(roomCode, state);
      case "end":
        return await handleEnd(roomCode);
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
  } catch (err) {
    console.error("CONTROL ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

async function handleStart(roomCode: string, state: Record<string, unknown>) {
  if (state.status !== "waiting") {
    return NextResponse.json({ error: "Partie deja commencee" }, { status: 409 });
  }

  // Passer en phase intro (animation + regles)
  await redis.hset(`room:${roomCode}:state`, { status: "intro" });
  await redis.incr(`room:${roomCode}:version`);

  return NextResponse.json({ status: "intro" });
}

async function handleBegin(roomCode: string, state: Record<string, unknown>) {
  if (state.status !== "intro") {
    return NextResponse.json({ error: "Pas en phase intro" }, { status: 409 });
  }

  return startNextQuestion(roomCode, state, 0);
}

async function handleNext(roomCode: string, state: Record<string, unknown>) {
  const currentIndex = Number(state.currentQuestionIndex);
  const totalQuestions = Number(state.totalQuestions);

  // Si on est en mode playing et le timer est expire, d'abord resoudre
  if (state.status === "playing") {
    const deadline = Number(state.questionDeadline);
    if (Date.now() > deadline) {
      await resolveCurrentQuestion(roomCode, currentIndex, state);
    }
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex >= totalQuestions) {
    return handleEnd(roomCode);
  }

  return startNextQuestion(roomCode, state, nextIndex);
}

async function startNextQuestion(
  roomCode: string,
  state: Record<string, unknown>,
  questionIndex: number
) {
  const questionIds: number[] = ensureParsed<number[]>(state.questionIds);
  const questionId = questionIds[questionIndex];

  const qResult = await sql`
    SELECT time_limit FROM questions WHERE id = ${questionId}
  `;
  const timeLimit = qResult.length > 0 ? (qResult[0].time_limit as number) : 15;

  const now = Date.now();
  const deadline = now + timeLimit * 1000;

  await redis.hset(`room:${roomCode}:state`, {
    status: "playing",
    currentQuestionIndex: questionIndex,
    questionDeadline: deadline,
    questionStartedAt: now,
    timeLimitSeconds: timeLimit,
  });
  await redis.incr(`room:${roomCode}:version`);

  return NextResponse.json({
    status: "playing",
    questionIndex,
    deadline,
    serverTime: now,
  });
}

async function resolveCurrentQuestion(
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

  // Sauvegarder les scores AVANT resolution pour calculer les changements de rang
  const prevScoresRaw = await redis.zrange(`room:${roomCode}:scores`, 0, -1, { withScores: true, rev: true });
  const prevRanks: Record<string, number> = {};
  if (prevScoresRaw && Array.isArray(prevScoresRaw)) {
    let rank = 1;
    for (let i = 0; i < prevScoresRaw.length; i += 2) {
      prevRanks[prevScoresRaw[i] as string] = rank++;
    }
  }

  const answersRaw = await redis.hgetall(`room:${roomCode}:answers:${qIndex}`);
  const pipeline = redis.pipeline();

  // Calculer les points et stocker pour le state
  const pointsMap: Record<string, number> = {};

  if (answersRaw) {
    for (const [pId, answerStr] of Object.entries(answersRaw)) {
      const answer = ensureParsed<{ optionId: number; answeredAt: number }>(answerStr);
      const isCorrect = answer.optionId === correctIndex;
      const elapsedMs = answer.answeredAt - questionStartedAt;
      const points = calculateScore(difficulty, isCorrect, elapsedMs, timeLimit);
      pointsMap[pId] = points;

      if (points > 0) {
        pipeline.zincrby(`room:${roomCode}:scores`, points, pId);
      }

      const pRaw = await redis.hget(`room:${roomCode}:players`, pId);
      if (pRaw) {
        const p = ensureParsed<Record<string, unknown>>(pRaw);
        const newStreak = isCorrect ? (Number(p.streak) || 0) + 1 : 0;
        const newScore = (Number(p.score) || 0) + points;
        pipeline.hset(`room:${roomCode}:players`, {
          [pId]: JSON.stringify({ ...p, score: newScore, streak: newStreak }),
        });
      }
    }
  }

  // Stocker les prevRanks et pointsMap dans Redis pour que le state route puisse les lire
  pipeline.set(`room:${roomCode}:prevRanks`, JSON.stringify(prevRanks), { ex: 300 });
  pipeline.set(`room:${roomCode}:pointsMap`, JSON.stringify(pointsMap), { ex: 300 });

  pipeline.hset(`room:${roomCode}:state`, { status: "reveal" });
  pipeline.incr(`room:${roomCode}:version`);

  await pipeline.exec();
}

async function handleEnd(roomCode: string) {
  // Recuperer les scores finaux
  const scoresRaw = await redis.zrange(`room:${roomCode}:scores`, 0, -1, {
    withScores: true,
    rev: true,
  });

  // Sauvegarder dans Neon
  const playersRaw = await redis.hgetall(`room:${roomCode}:players`);
  const playerCount = playersRaw ? Object.keys(playersRaw).length : 0;
  const state = await redis.hgetall(`room:${roomCode}:state`);

  try {
    const gameResult = await sql`
      INSERT INTO games (room_code, player_count, total_questions, finished_at)
      VALUES (${roomCode}, ${playerCount}, ${Number(state?.totalQuestions || 0)}, NOW())
      RETURNING id
    `;
    const gameId = gameResult[0].id;

    if (scoresRaw && Array.isArray(scoresRaw)) {
      let rank = 1;
      for (let i = 0; i < scoresRaw.length; i += 2) {
        const pId = scoresRaw[i] as string;
        const score = Number(scoresRaw[i + 1]);
        const pRaw = playersRaw?.[pId];
        const p = pRaw ? (ensureParsed<Record<string, unknown>>(pRaw)) : null;

        await sql`
          INSERT INTO game_players (game_id, player_name, final_score, correct_answers, rank)
          VALUES (${gameId}, ${p?.name || "Unknown"}, ${score}, ${0}, ${rank})
        `;
        rank++;
      }
    }
  } catch {
    console.error("Erreur sauvegarde historique");
  }

  // Marquer la room comme finie
  await redis.hset(`room:${roomCode}:state`, { status: "finished" });
  await redis.incr(`room:${roomCode}:version`);

  // Reduire TTL a 15min
  const keys = [
    `room:${roomCode}:state`,
    `room:${roomCode}:players`,
    `room:${roomCode}:scores`,
    `room:${roomCode}:version`,
    `room:index:${roomCode}`,
  ];
  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.expire(key, 900);
  }
  await pipeline.exec();

  return NextResponse.json({ status: "finished" });
}

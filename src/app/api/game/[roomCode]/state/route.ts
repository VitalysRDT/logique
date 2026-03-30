import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sql } from "@/lib/db";
import type { Player, QuestionForClient } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const url = new URL(request.url);
  const clientVersion = Number(url.searchParams.get("v") || "0");

  // Verification rapide de la version
  const currentVersion = await redis.get<number>(`room:${roomCode}:version`);
  if (currentVersion === null) {
    return NextResponse.json({ error: "Room introuvable" }, { status: 404 });
  }

  if (clientVersion > 0 && currentVersion === clientVersion) {
    return new Response(null, { status: 304 });
  }

  // Lire l'etat complet
  const [stateRaw, playersRaw, scoresRaw] = await Promise.all([
    redis.hgetall(`room:${roomCode}:state`),
    redis.hgetall(`room:${roomCode}:players`),
    redis.zrange(`room:${roomCode}:scores`, 0, -1, { withScores: true, rev: true }),
  ]);

  if (!stateRaw || !stateRaw.roomCode) {
    return NextResponse.json({ error: "Room introuvable" }, { status: 404 });
  }

  // Parser les joueurs (sans les tokens)
  const players: Player[] = [];
  if (playersRaw) {
    for (const value of Object.values(playersRaw)) {
      const p = typeof value === "string" ? JSON.parse(value) : value;
      players.push({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score || 0,
        streak: p.streak || 0,
        connected: p.connected,
        joinedAt: p.joinedAt,
      });
    }
  }

  // Parser les scores
  const scores: { playerId: string; score: number }[] = [];
  if (scoresRaw && Array.isArray(scoresRaw)) {
    for (let i = 0; i < scoresRaw.length; i += 2) {
      scores.push({
        playerId: scoresRaw[i] as string,
        score: Number(scoresRaw[i + 1]),
      });
    }
  }

  // Charger la question courante si en jeu
  let currentQuestion: QuestionForClient | undefined;
  const status = stateRaw.status as string;
  const qIndex = Number(stateRaw.currentQuestionIndex);

  if ((status === "playing" || status === "reveal") && qIndex >= 0) {
    const questionIds: number[] = JSON.parse(stateRaw.questionIds as string);
    const questionId = questionIds[qIndex];

    if (questionId) {
      const qResult = await sql`
        SELECT id, difficulty, category, type, text, choices, svg_config, time_limit,
               correct_index, explanation
        FROM questions WHERE id = ${questionId}
      `;

      if (qResult.length > 0) {
        const q = qResult[0];
        currentQuestion = {
          id: q.id as number,
          difficulty: q.difficulty as number,
          category: q.category as string,
          type: q.type as "text" | "svg",
          text: q.text as string,
          choices: q.choices as string[],
          svg_config: q.svg_config as QuestionForClient["svg_config"],
          time_limit: q.time_limit as number,
        };

        // Si reveal, inclure la reponse
        if (status === "reveal") {
          const answersRaw = await redis.hgetall(`room:${roomCode}:answers:${qIndex}`);
          const playerResults = players.map((p) => {
            const answerStr = answersRaw?.[p.id];
            const answer = answerStr
              ? typeof answerStr === "string" ? JSON.parse(answerStr) : answerStr
              : null;
            return {
              playerId: p.id,
              playerName: p.name,
              chosenIndex: answer?.optionId ?? null,
              correct: answer ? answer.optionId === (q.correct_index as number) : false,
              pointsEarned: 0,
              totalScore: 0,
            };
          });

          return NextResponse.json({
            room: {
              ...stateRaw,
              questionIds: undefined,
              version: currentVersion,
            },
            players,
            scores,
            currentQuestion,
            revealData: {
              correctIndex: q.correct_index as number,
              explanation: q.explanation as string,
              playerResults,
            },
            version: currentVersion,
          });
        }
      }
    }
  }

  // Qui a deja repondu a la question courante ?
  let answeredPlayerIds: string[] = [];
  if (status === "playing" && qIndex >= 0) {
    const answersRaw = await redis.hgetall(`room:${roomCode}:answers:${qIndex}`);
    if (answersRaw) {
      answeredPlayerIds = Object.keys(answersRaw);
    }
  }

  return NextResponse.json({
    room: {
      roomCode: stateRaw.roomCode,
      hostId: stateRaw.hostId,
      status: stateRaw.status,
      currentQuestionIndex: Number(stateRaw.currentQuestionIndex),
      totalQuestions: Number(stateRaw.totalQuestions),
      questionDeadline: Number(stateRaw.questionDeadline),
      questionStartedAt: Number(stateRaw.questionStartedAt),
      timeLimitSeconds: Number(stateRaw.timeLimitSeconds),
      maxPlayers: Number(stateRaw.maxPlayers),
      version: currentVersion,
    },
    players,
    scores,
    currentQuestion,
    answeredPlayerIds,
    version: currentVersion,
  });
}

import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sql } from "@/lib/db";
import { ensureParsed } from "@/lib/parse";
import type { Player, QuestionForClient } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const url = new URL(request.url);
    const clientVersion = Number(url.searchParams.get("v") || "0");

    const currentVersion = await redis.get<number>(`room:${roomCode}:version`);
    if (currentVersion === null) {
      return NextResponse.json({ error: "Room introuvable" }, { status: 404 });
    }

    if (clientVersion > 0 && currentVersion === clientVersion) {
      return new Response(null, { status: 304 });
    }

    const [stateRaw, playersRaw, scoresRaw] = await Promise.all([
      redis.hgetall(`room:${roomCode}:state`),
      redis.hgetall(`room:${roomCode}:players`),
      redis.zrange(`room:${roomCode}:scores`, 0, -1, { withScores: true, rev: true }),
    ]);

    if (!stateRaw || !stateRaw.roomCode) {
      return NextResponse.json({ error: "Room introuvable" }, { status: 404 });
    }

    // Parser joueurs (sans tokens)
    const players: Player[] = [];
    if (playersRaw) {
      for (const value of Object.values(playersRaw)) {
        const p = ensureParsed<Record<string, unknown>>(value);
        players.push({
          id: p.id as string,
          name: p.name as string,
          avatar: p.avatar as string,
          score: Number(p.score) || 0,
          streak: Number(p.streak) || 0,
          connected: p.connected as boolean,
          joinedAt: p.joinedAt as number,
        });
      }
    }

    // Parser scores
    const scores: { playerId: string; score: number }[] = [];
    if (scoresRaw && Array.isArray(scoresRaw)) {
      for (let i = 0; i < scoresRaw.length; i += 2) {
        scores.push({ playerId: scoresRaw[i] as string, score: Number(scoresRaw[i + 1]) });
      }
    }

    const status = stateRaw.status as string;
    const qIndex = Number(stateRaw.currentQuestionIndex);
    const questionIds: number[] = ensureParsed<number[]>(stateRaw.questionIds || "[]");

    // Question courante
    let currentQuestion: QuestionForClient | undefined;
    let nextQuestion: QuestionForClient | undefined;

    if ((status === "playing" || status === "reveal") && qIndex >= 0) {
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

          // Si reveal : inclure reponse + rangs enrichis
          if (status === "reveal") {
            const [answersRaw, prevRanksRaw, pointsMapRaw] = await Promise.all([
              redis.hgetall(`room:${roomCode}:answers:${qIndex}`),
              redis.get(`room:${roomCode}:prevRanks`),
              redis.get(`room:${roomCode}:pointsMap`),
            ]);

            const prevRanks = prevRanksRaw ? ensureParsed<Record<string, number>>(prevRanksRaw) : {};
            const pointsMap = pointsMapRaw ? ensureParsed<Record<string, number>>(pointsMapRaw) : {};

            // Calculer les nouveaux rangs depuis les scores tries
            const newRanks: Record<string, number> = {};
            scores.forEach((s, i) => { newRanks[s.playerId] = i + 1; });

            const playerResults = players.map((p) => {
              const answerStr = answersRaw?.[p.id];
              const answer = answerStr ? ensureParsed<Record<string, unknown>>(answerStr) : null;
              return {
                playerId: p.id,
                playerName: p.name,
                chosenIndex: (answer?.optionId as number) ?? null,
                correct: answer ? answer.optionId === (q.correct_index as number) : false,
                pointsEarned: pointsMap[p.id] || 0,
                totalScore: scores.find((s) => s.playerId === p.id)?.score || 0,
                previousRank: prevRanks[p.id] || newRanks[p.id] || 0,
                newRank: newRanks[p.id] || 0,
              };
            });

            // Charger la question suivante pour prefetch
            const nextQId = questionIds[qIndex + 1];
            if (nextQId) {
              const nqResult = await sql`
                SELECT id, difficulty, category, type, text, choices, svg_config, time_limit
                FROM questions WHERE id = ${nextQId}
              `;
              if (nqResult.length > 0) {
                const nq = nqResult[0];
                nextQuestion = {
                  id: nq.id as number,
                  difficulty: nq.difficulty as number,
                  category: nq.category as string,
                  type: nq.type as "text" | "svg",
                  text: nq.text as string,
                  choices: nq.choices as string[],
                  svg_config: nq.svg_config as QuestionForClient["svg_config"],
                  time_limit: nq.time_limit as number,
                };
              }
            }

            return NextResponse.json({
              room: buildRoom(stateRaw, currentVersion),
              players,
              scores,
              currentQuestion,
              nextQuestion,
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

      // Charger nextQuestion aussi en phase playing (pour prefetch)
      const nextQId = questionIds[qIndex + 1];
      if (nextQId) {
        const nqResult = await sql`
          SELECT id, difficulty, category, type, text, choices, svg_config, time_limit
          FROM questions WHERE id = ${nextQId}
        `;
        if (nqResult.length > 0) {
          const nq = nqResult[0];
          nextQuestion = {
            id: nq.id as number,
            difficulty: nq.difficulty as number,
            category: nq.category as string,
            type: nq.type as "text" | "svg",
            text: nq.text as string,
            choices: nq.choices as string[],
            svg_config: nq.svg_config as QuestionForClient["svg_config"],
            time_limit: nq.time_limit as number,
          };
        }
      }
    }

    // Qui a repondu ?
    let answeredPlayerIds: string[] = [];
    if (status === "playing" && qIndex >= 0) {
      const answersRaw = await redis.hgetall(`room:${roomCode}:answers:${qIndex}`);
      if (answersRaw) answeredPlayerIds = Object.keys(answersRaw);
    }

    // Charger Q1 pour prefetch si on est en intro ou waiting
    if ((status === "intro" || status === "waiting") && questionIds.length > 0) {
      const firstQId = questionIds[0];
      if (firstQId) {
        const fqResult = await sql`
          SELECT id, difficulty, category, type, text, choices, svg_config, time_limit
          FROM questions WHERE id = ${firstQId}
        `;
        if (fqResult.length > 0) {
          const fq = fqResult[0];
          nextQuestion = {
            id: fq.id as number,
            difficulty: fq.difficulty as number,
            category: fq.category as string,
            type: fq.type as "text" | "svg",
            text: fq.text as string,
            choices: fq.choices as string[],
            svg_config: fq.svg_config as QuestionForClient["svg_config"],
            time_limit: fq.time_limit as number,
          };
        }
      }
    }

    return NextResponse.json({
      room: buildRoom(stateRaw, currentVersion),
      players,
      scores,
      currentQuestion,
      nextQuestion,
      answeredPlayerIds,
      version: currentVersion,
    });
  } catch (err) {
    console.error("STATE ERROR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}

function buildRoom(stateRaw: Record<string, unknown>, version: number | null) {
  return {
    roomCode: stateRaw.roomCode,
    hostId: stateRaw.hostId,
    mode: (stateRaw.mode as string) || "party",
    status: stateRaw.status,
    currentQuestionIndex: Number(stateRaw.currentQuestionIndex),
    totalQuestions: Number(stateRaw.totalQuestions),
    questionDeadline: Number(stateRaw.questionDeadline),
    questionStartedAt: Number(stateRaw.questionStartedAt),
    timeLimitSeconds: Number(stateRaw.timeLimitSeconds),
    maxPlayers: Number(stateRaw.maxPlayers),
    version,
  };
}

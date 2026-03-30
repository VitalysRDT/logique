import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { ensureParsed } from "@/lib/parse";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const { playerId, token } = await request.json();

    if (!playerId || !token) {
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

    // Verifier que c'est bien en phase reveal
    const status = await redis.hget(`room:${roomCode}:state`, "status");
    if (status !== "reveal") {
      return NextResponse.json({ error: "Pas en phase reveal" }, { status: 409 });
    }

    // Marquer comme pret
    await redis.hset(`room:${roomCode}:ready`, { [playerId]: "1" });
    await redis.expire(`room:${roomCode}:ready`, 7200);
    await redis.incr(`room:${roomCode}:version`);

    // Verifier si tous sont prets
    const playersRaw = await redis.hgetall(`room:${roomCode}:players`);
    const playerCount = playersRaw ? Object.keys(playersRaw).length : 0;
    const readyRaw = await redis.hgetall(`room:${roomCode}:ready`);
    const readyCount = readyRaw ? Object.keys(readyRaw).length : 0;

    const allReady = readyCount >= playerCount;

    if (allReady) {
      // Avancer a la question suivante automatiquement
      const state = await redis.hgetall(`room:${roomCode}:state`);
      if (!state) return NextResponse.json({ allReady });

      const currentIndex = Number(state.currentQuestionIndex);
      const totalQuestions = Number(state.totalQuestions);
      const questionIds = ensureParsed<number[]>(state.questionIds);

      // Nettoyer le ready
      await redis.del(`room:${roomCode}:ready`);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= totalQuestions) {
        // Fin de partie
        await redis.hset(`room:${roomCode}:state`, { status: "finished" });
        await redis.incr(`room:${roomCode}:version`);
        return NextResponse.json({ allReady: true, finished: true });
      }

      // Demarrer la prochaine question
      const { sql } = await import("@/lib/db");
      const nextQId = questionIds[nextIndex];
      const qResult = await sql`SELECT time_limit FROM questions WHERE id = ${nextQId}`;
      const timeLimit = qResult.length > 0 ? (qResult[0].time_limit as number) : 15;

      const now = Date.now();
      await redis.hset(`room:${roomCode}:state`, {
        status: "playing",
        currentQuestionIndex: nextIndex,
        questionDeadline: now + timeLimit * 1000,
        questionStartedAt: now,
        timeLimitSeconds: timeLimit,
      });
      await redis.incr(`room:${roomCode}:version`);

      return NextResponse.json({ allReady: true, nextQuestion: true });
    }

    return NextResponse.json({ allReady: false, readyCount, playerCount });
  } catch (err) {
    console.error("READY ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}

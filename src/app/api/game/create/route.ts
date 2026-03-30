import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sql } from "@/lib/db";
import { generateRoomCode } from "@/lib/room-code";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  try {
    const { hostName, avatar = "🎮" } = await request.json();

    if (!hostName || typeof hostName !== "string" || hostName.trim().length < 1) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    // Generer un code room unique
    let roomCode = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateRoomCode();
      const claimed = await redis.setnx(`room:index:${code}`, "1");
      if (claimed) {
        roomCode = code;
        await redis.expire(`room:index:${code}`, 7200);
        break;
      }
    }

    if (!roomCode) {
      return NextResponse.json({ error: "Impossible de creer une room" }, { status: 500 });
    }

    // Selectionner 100 questions triees par difficulte
    const questionsResult = await sql`
      SELECT id, difficulty, time_limit FROM questions ORDER BY difficulty ASC, random()
    `;
    const questionIds = questionsResult.map((q) => (q as Record<string, number>).id);

    const hostId = nanoid(12);
    const hostToken = nanoid(32);
    const now = Date.now();

    // Creer l'etat de la room dans Redis (pipeline)
    const pipeline = redis.pipeline();

    pipeline.hset(`room:${roomCode}:state`, {
      roomCode,
      hostId,
      status: "waiting",
      currentQuestionIndex: -1,
      questionIds: JSON.stringify(questionIds),
      totalQuestions: questionIds.length,
      questionDeadline: 0,
      questionStartedAt: 0,
      timeLimitSeconds: 15,
      maxPlayers: 8,
      version: 1,
    });
    pipeline.expire(`room:${roomCode}:state`, 7200);

    pipeline.hset(`room:${roomCode}:players`, {
      [hostId]: JSON.stringify({
        id: hostId,
        name: hostName.trim(),
        avatar,
        score: 0,
        streak: 0,
        connected: true,
        joinedAt: now,
        token: hostToken,
      }),
    });
    pipeline.expire(`room:${roomCode}:players`, 7200);

    pipeline.zadd(`room:${roomCode}:scores`, { score: 0, member: hostId });
    pipeline.expire(`room:${roomCode}:scores`, 7200);

    pipeline.set(`room:${roomCode}:version`, 1, { ex: 7200 });

    await pipeline.exec();

    return NextResponse.json({
      roomCode,
      playerId: hostId,
      token: hostToken,
    }, { status: 201 });
  } catch (err) {
    console.error("CREATE ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

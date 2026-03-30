import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const { roomCode, playerName, avatar = "🎯" } = await request.json();

  if (!roomCode || !playerName) {
    return NextResponse.json({ error: "Code room et nom requis" }, { status: 400 });
  }

  const code = roomCode.toUpperCase().trim();

  // Verifier que la room existe
  const state = await redis.hgetall(`room:${code}:state`);
  if (!state || !state.roomCode) {
    return NextResponse.json({ error: "Room introuvable" }, { status: 404 });
  }

  if (state.status !== "waiting") {
    return NextResponse.json({ error: "La partie a deja commence" }, { status: 409 });
  }

  // Verifier le nombre de joueurs
  const players = await redis.hgetall(`room:${code}:players`);
  const playerCount = players ? Object.keys(players).length : 0;
  if (playerCount >= Number(state.maxPlayers)) {
    return NextResponse.json({ error: "Room pleine" }, { status: 409 });
  }

  const playerId = nanoid(12);
  const playerToken = nanoid(32);
  const now = Date.now();

  const pipeline = redis.pipeline();

  pipeline.hset(`room:${code}:players`, {
    [playerId]: JSON.stringify({
      id: playerId,
      name: playerName.trim(),
      avatar,
      score: 0,
      streak: 0,
      connected: true,
      joinedAt: now,
      token: playerToken,
    }),
  });

  pipeline.zadd(`room:${code}:scores`, { score: 0, member: playerId });
  pipeline.incr(`room:${code}:version`);

  await pipeline.exec();

  return NextResponse.json({
    playerId,
    token: playerToken,
    roomCode: code,
  });
}

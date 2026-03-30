"use client";

import { useCallback } from "react";

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return { error: `HTTP ${res.status}` };
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export function useGameActions(roomCode: string) {
  const getCredentials = useCallback(() => {
    if (typeof window === "undefined") return { playerId: "", token: "" };
    return {
      playerId: sessionStorage.getItem(`player_${roomCode}`) || "",
      token: sessionStorage.getItem(`token_${roomCode}`) || "",
    };
  }, [roomCode]);

  const submitAnswer = useCallback(
    async (optionId: number) => {
      const { playerId, token } = getCredentials();
      const res = await fetch(`/api/game/${roomCode}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, token, optionId }),
      });
      return safeJson(res);
    },
    [roomCode, getCredentials]
  );

  const hostControl = useCallback(
    async (action: "start" | "begin" | "next" | "end") => {
      const { playerId, token } = getCredentials();
      const res = await fetch(`/api/game/${roomCode}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, token, action }),
      });
      return safeJson(res);
    },
    [roomCode, getCredentials]
  );

  return { submitAnswer, hostControl, getCredentials };
}

"use client";

import { useCallback } from "react";

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
      return res.json();
    },
    [roomCode, getCredentials]
  );

  const hostControl = useCallback(
    async (action: "start" | "next" | "end") => {
      const { playerId, token } = getCredentials();
      const res = await fetch(`/api/game/${roomCode}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, token, action }),
      });
      return res.json();
    },
    [roomCode, getCredentials]
  );

  return { submitAnswer, hostControl, getCredentials };
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameState } from "@/lib/types";

export function useGameState(roomCode: string) {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/game/${roomCode}/state?v=${versionRef.current}`
      );
      if (res.status === 304) return;
      if (res.status === 404) {
        setError("Room introuvable");
        return;
      }
      if (!res.ok) {
        setError("Erreur serveur");
        return;
      }
      const data = await res.json();
      versionRef.current = data.version;
      setState(data);
      setError(null);
    } catch {
      setError("Connexion perdue");
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 300);
    return () => clearInterval(interval);
  }, [fetchState]);

  return { state, loading, error, refetch: fetchState };
}

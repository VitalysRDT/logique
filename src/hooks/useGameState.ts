"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GameState } from "@/lib/types";

let supabaseClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabaseClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return supabaseClient;
}

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

  // Primary transport: Supabase Realtime. Each server mutation broadcasts a
  // "state" event on room:<code>; we react by refetching the source of truth
  // (Redis/Postgres via /api/game/<code>/state).
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const ch = supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "state" }, () => {
      void fetchState();
    }).subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [roomCode, fetchState]);

  // Initial fetch + slow fallback poll (12s) for resilience if a Realtime
  // broadcast is missed (was a 300ms poll; Realtime is now primary).
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 12000);
    return () => clearInterval(interval);
  }, [fetchState]);

  return { state, loading, error, refetch: fetchState };
}

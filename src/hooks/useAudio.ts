"use client";

import { useRef, useCallback } from "react";

interface QueueItem {
  text: string;
  resolve: () => void;
}

export function useAudio() {
  const queueRef = useRef<QueueItem[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const processQueue = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    playingRef.current = true;

    const item = queueRef.current.shift()!;

    try {
      let blobUrl = cacheRef.current.get(item.text);

      if (!blobUrl) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: item.text }),
        });

        if (!res.ok) {
          item.resolve();
          playingRef.current = false;
          processQueue();
          return;
        }

        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        cacheRef.current.set(item.text, blobUrl);
      }

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    } catch {
      // silently continue
    }

    item.resolve();
    playingRef.current = false;
    processQueue();
  }, []);

  // Retourne une Promise qui resolve quand l'audio de CE texte finit
  const speakAsync = useCallback(
    (text: string): Promise<void> => {
      return new Promise<void>((resolve) => {
        queueRef.current.push({ text, resolve });
        processQueue();
      });
    },
    [processQueue]
  );

  // Fire-and-forget (compat)
  const speak = useCallback(
    (text: string) => {
      speakAsync(text);
    },
    [speakAsync]
  );

  // Interrompt tout, joue immediatement, retourne une Promise
  const speakNow = useCallback(
    (text: string): Promise<void> => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Resolve toutes les promises en attente pour ne pas bloquer les await
      queueRef.current.forEach((item) => item.resolve());
      queueRef.current = [];
      playingRef.current = false;
      return speakAsync(text);
    },
    [speakAsync]
  );

  const prefetch = useCallback(async (text: string) => {
    if (cacheRef.current.has(text)) return;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        cacheRef.current.set(text, URL.createObjectURL(blob));
      }
    } catch {
      // ignore
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    queueRef.current.forEach((item) => item.resolve());
    queueRef.current = [];
    playingRef.current = false;
  }, []);

  return { speak, speakAsync, speakNow, prefetch, stop };
}

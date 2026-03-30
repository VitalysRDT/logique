"use client";

import { useRef, useCallback } from "react";

export function useAudio() {
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const processQueue = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    playingRef.current = true;

    const text = queueRef.current.shift()!;

    try {
      let blobUrl = cacheRef.current.get(text);

      if (!blobUrl) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) {
          playingRef.current = false;
          processQueue();
          return;
        }

        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        cacheRef.current.set(text, blobUrl);
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

    playingRef.current = false;
    processQueue();
  }, []);

  const speak = useCallback(
    (text: string) => {
      queueRef.current.push(text);
      processQueue();
    },
    [processQueue]
  );

  const speakNow = useCallback(
    (text: string) => {
      // Stop current, clear queue, play this
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      queueRef.current = [];
      playingRef.current = false;
      speak(text);
    },
    [speak]
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
    queueRef.current = [];
    playingRef.current = false;
  }, []);

  return { speak, speakNow, prefetch, stop };
}

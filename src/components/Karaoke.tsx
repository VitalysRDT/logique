"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { QuizType } from "@/lib/types";
import { getKaraokeSong } from "@/lib/karaoke-songs";

export default function KaraokeFullscreen({
  quizType = "logique",
  onSkip,
}: {
  quizType?: QuizType;
  onSkip: () => void;
}) {
  const song = getKaraokeSong(quizType);
  const [started, setStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [lineIndex, setLineIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const LYRICS = song?.lyrics ?? [];
  const theme = song?.theme;

  const tick = useCallback(() => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setCurrentTime(t);

    let idx = -1;
    for (let i = LYRICS.length - 1; i >= 0; i--) {
      if (t >= LYRICS[i].time) { idx = i; break; }
    }
    setLineIndex(idx);

    if (!audioRef.current.paused && !audioRef.current.ended) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [LYRICS]);

  function start() {
    if (!song) return onSkip();
    const audio = new Audio(song.audioSrc);
    audioRef.current = audio;
    audio.addEventListener("ended", () => onSkip());
    audio.play().then(() => {
      setStarted(true);
      rafRef.current = requestAnimationFrame(tick);
    }).catch(() => {
      // Autoplay bloqué - on démarre quand même
      setStarted(true);
      rafRef.current = requestAnimationFrame(tick);
    });
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  function handleSkip() {
    cancelAnimationFrame(rafRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    onSkip();
  }

  // Pas de karaoké pour ce quiz → on passe directement
  if (!song || !theme) {
    onSkip();
    return null;
  }

  const currentLine = lineIndex >= 0 ? LYRICS[lineIndex] : null;
  const progressPct = (currentTime / song.totalDuration) * 100;

  // Style par type de ligne
  function lineStyle(type?: string, isCurrent?: boolean) {
    if (!isCurrent) return "text-white/20";
    switch (type) {
      case "chorus": return `text-transparent bg-clip-text bg-gradient-to-r ${theme!.chorusGradient} animate-gradient bg-[length:200%_200%] scale-110`;
      case "shout": return `${theme!.shoutColor} scale-115`;
      case "bridge": return `${theme!.bridgeColor} italic scale-105`;
      case "instrumental": return "text-white/30";
      default: return "text-white";
    }
  }

  // Splash screen "Appuyez pour commencer"
  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black" onClick={start}>
        <div className={`absolute inset-0 bg-gradient-to-b ${theme.splashBgGradient}`} />
        <div className="relative z-10 text-center px-6">
          <h1 className={`font-display text-6xl md:text-8xl font-bold bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent animate-gradient bg-[length:200%_200%] mb-6`}>
            {song.title}
          </h1>
          <p className="text-xl text-white/60 mb-12">{song.splashSubtitle}</p>
          <button className="px-8 py-4 rounded-2xl bg-white/10 border border-white/20 text-lg font-bold hover:bg-white/20 transition-all animate-pulse-glow">
            Appuyez pour commencer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-black overflow-hidden select-none">
      {/* Fond animé */}
      <div className="absolute inset-0">
        <div className={`absolute inset-0 bg-gradient-to-b ${theme.bgGradient}`} />
        {/* Orbes animées */}
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 ${theme.orb1} rounded-full blur-[120px] animate-pulse`} style={{ animationDuration: "4s" }} />
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 ${theme.orb2} rounded-full blur-[100px] animate-pulse`} style={{ animationDuration: "5s", animationDelay: "1s" }} />
        {currentLine?.type === "chorus" && (
          <div className={`absolute inset-0 ${theme.chorusOverlay} transition-all duration-500`} />
        )}
        {currentLine?.type === "shout" && (
          <div className={`absolute inset-0 ${theme.shoutOverlay} transition-all duration-300`} />
        )}
      </div>

      {/* Bandeau défilant style breaking news (optionnel) */}
      {song.ticker && (
        <div className="relative z-10 mt-3 mx-3 overflow-hidden rounded-md border border-white/10 bg-red-600/10 py-1.5">
          <div className="flex whitespace-nowrap animate-marquee text-xs font-bold tracking-wider text-amber-200/80 uppercase">
            <span className="px-2">{song.ticker.repeat(4)}</span>
            <span className="px-2">{song.ticker.repeat(4)}</span>
          </div>
        </div>
      )}

      {/* Titre (petit, en haut) */}
      <div className="relative z-10 pt-4 text-center">
        <p className="text-sm tracking-[0.3em] text-white/30 uppercase">{song.tagline}</p>
      </div>

      {/* Zone paroles — centre de l'écran */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Lignes précédentes (défilent vers le haut) */}
        <div className="space-y-2 mb-6">
          {LYRICS.slice(Math.max(0, lineIndex - 2), Math.max(0, lineIndex)).map((l, i) => (
            <p key={`prev-${i}`} className={`text-center text-lg md:text-xl font-bold transition-all duration-500 ${i === 0 ? "text-white/10" : "text-white/20"}`}>
              {l.text}
            </p>
          ))}
        </div>

        {/* LIGNE COURANTE */}
        <div className="min-h-[80px] md:min-h-[100px] flex items-center justify-center">
          {currentLine && (
            <p className={`text-center text-3xl md:text-5xl font-bold font-display transition-all duration-300 leading-tight ${lineStyle(currentLine.type, true)}`}>
              {currentLine.text}
            </p>
          )}
        </div>

        {/* Lignes suivantes (preview) */}
        <div className="space-y-2 mt-6">
          {LYRICS.slice(lineIndex + 1, lineIndex + 3).map((l, i) => (
            <p key={`next-${i}`} className={`text-center text-lg md:text-xl font-bold transition-all duration-500 ${i === 0 ? "text-white/25" : "text-white/10"}`}>
              {l.text}
            </p>
          ))}
        </div>
      </div>

      {/* Barre du bas */}
      <div className="relative z-10 pb-6 px-6">
        {/* Barre de progression */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
          <div className={`h-full bg-gradient-to-r ${theme.progress} rounded-full transition-all duration-100`} style={{ width: `${progressPct}%` }} />
        </div>

        <div className="flex items-center justify-between">
          {/* Temps */}
          <span className="text-sm font-mono-game text-white/30">
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
            <span className="text-white/15"> / {Math.floor(song.totalDuration / 60)}:{String(Math.floor(song.totalDuration % 60)).padStart(2, "0")}</span>
          </span>

          {/* Égaliseur */}
          <div className="flex gap-[3px] items-end h-5">
            {[0,1,2,3,4,5,6].map((i) => (
              <div key={i} className={`w-[3px] rounded-full bg-gradient-to-t ${theme.eq} animate-pulse`}
                style={{
                  height: `${6 + (currentLine?.type === "chorus" ? 14 : currentLine?.type === "shout" ? 12 : 8) * Math.random()}px`,
                  animationDelay: `${i * 80}ms`,
                  animationDuration: `${300 + i * 50}ms`,
                }} />
            ))}
          </div>

          {/* Bouton passer */}
          <button onClick={handleSkip}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/40 hover:text-white/70 transition-all">
            Passer
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

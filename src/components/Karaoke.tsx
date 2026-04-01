"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface LyricLine {
  time: number; // seconds
  text: string;
  type?: "chorus" | "bridge" | "normal" | "shout";
}

const LYRICS: LyricLine[] = [
  // Intro instrumental
  { time: 0, text: "♪ ♪ ♪", type: "normal" },

  // Couplet 1
  { time: 8, text: "Ce soir on joue, ce soir on pense" },
  { time: 12, text: "Cent questions pour tester votre intelligence" },
  { time: 16, text: "Du trivial jusqu'à l'impossible" },
  { time: 20, text: "Seuls les meilleurs seront invincibles" },

  // Pré-refrain
  { time: 24, text: "Trois, deux, un, c'est parti !", type: "shout" },
  { time: 27, text: "Buzzez vite, buzzez bien" },
  { time: 30, text: "Le chrono tourne, pas le choix" },
  { time: 33, text: "Réfléchissez, appuyez !" },

  // Refrain
  { time: 36, text: "Lo-gi-que ! Lo-gi-que !", type: "chorus" },
  { time: 40, text: "On allume les cerveaux ce soir", type: "chorus" },
  { time: 44, text: "Lo-gi-que ! Lo-gi-que !", type: "chorus" },
  { time: 48, text: "Qui sera le plus fort, on va voir !", type: "chorus" },

  // Interlude
  { time: 52, text: "♪ ♪ ♪", type: "normal" },

  // Couplet 2
  { time: 56, text: "Niveau facile, ça va ça vient" },
  { time: 60, text: "Niveau expert, on n'y comprend rien" },
  { time: 64, text: "Les points qui montent, le score qui flambe" },
  { time: 68, text: "Est-ce que t'as le QI d'un génie ?" },

  // Pré-refrain 2
  { time: 72, text: "Plus vite tu buzzes, plus tu gagnes" },
  { time: 75, text: "La logique, c'est ton arme" },
  { time: 78, text: "Le classement change à chaque instant" },
  { time: 81, text: "Qui prend la tête maintenant ?", type: "shout" },

  // Refrain 2
  { time: 84, text: "Lo-gi-que ! Lo-gi-que !", type: "chorus" },
  { time: 88, text: "On allume les cerveaux ce soir", type: "chorus" },
  { time: 92, text: "Lo-gi-que ! Lo-gi-que !", type: "chorus" },
  { time: 96, text: "Qui sera le plus fort, on va voir !", type: "chorus" },

  // Bridge
  { time: 100, text: "Les neurones chauffent...", type: "bridge" },
  { time: 103, text: "La pression monte...", type: "bridge" },
  { time: 106, text: "Cinq secondes... quatre... trois...", type: "bridge" },

  // Refrain final
  { time: 109, text: "LO-GI-QUE ! LO-GI-QUE !", type: "shout" },
  { time: 112, text: "Le champion c'est toi, faut y croire !", type: "chorus" },

  // Outro
  { time: 116, text: "♪ ♪ ♪", type: "normal" },
];

export default function Karaoke() {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setCurrentTime(t);

    // Find current line
    let idx = -1;
    for (let i = LYRICS.length - 1; i >= 0; i--) {
      if (t >= LYRICS[i].time) {
        idx = i;
        break;
      }
    }
    setCurrentLineIndex(idx);

    if (!audioRef.current.paused) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  function togglePlay() {
    if (!audioRef.current) {
      const audio = new Audio("/audio/theme.mp3");
      audioRef.current = audio;
      audio.addEventListener("ended", () => {
        setPlaying(false);
        setCurrentLineIndex(-1);
        setCurrentTime(0);
      });
    }

    if (playing) {
      audioRef.current.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      audioRef.current.play();
      rafRef.current = requestAnimationFrame(tick);
      setPlaying(true);
    }
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const currentLine = currentLineIndex >= 0 ? LYRICS[currentLineIndex] : null;
  const nextLine = currentLineIndex + 1 < LYRICS.length ? LYRICS[currentLineIndex + 1] : null;
  const prevLine = currentLineIndex > 0 ? LYRICS[currentLineIndex - 1] : null;

  // Progress within current line (0 to 1)
  const lineProgress = currentLine && nextLine
    ? Math.min(1, (currentTime - currentLine.time) / (nextLine.time - currentLine.time))
    : 0;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Play button */}
      <button
        onClick={togglePlay}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl glass-strong hover:border-violet-500/30 transition-all group"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${playing ? "bg-violet-500 animate-pulse" : "bg-white/10 group-hover:bg-violet-500/50"}`}>
          {playing ? (
            <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="white" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          )}
        </div>
        <span className="text-sm text-[var(--text-secondary)] group-hover:text-white transition">
          {playing ? "En cours..." : "Écouter le générique"}
        </span>
        {playing && (
          <div className="flex gap-0.5 items-end h-4">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="w-1 bg-violet-400 rounded-full animate-pulse" style={{ height: `${8 + Math.random() * 8}px`, animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        )}
      </button>

      {/* Karaoke display */}
      {playing && (
        <div className="mt-4 rounded-2xl glass-strong p-5 text-center overflow-hidden animate-slide-up">
          {/* Previous line (fading) */}
          <p className="text-sm text-[var(--text-muted)] h-6 transition-all duration-300">
            {prevLine?.text || ""}
          </p>

          {/* Current line (highlighted) */}
          <div className="my-3 min-h-[48px] flex items-center justify-center">
            {currentLine ? (
              <p className={`font-bold transition-all duration-200 ${
                currentLine.type === "chorus"
                  ? "text-2xl bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent"
                  : currentLine.type === "shout"
                  ? "text-2xl text-yellow-400"
                  : currentLine.type === "bridge"
                  ? "text-xl text-violet-300 italic"
                  : "text-xl text-white"
              }`}>
                {currentLine.text}
              </p>
            ) : (
              <p className="text-[var(--text-muted)]">♪</p>
            )}
          </div>

          {/* Next line (preview) */}
          <p className="text-sm text-[var(--text-muted)] h-6 transition-all duration-300">
            {nextLine?.text || ""}
          </p>

          {/* Progress bar for current line */}
          <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-100"
              style={{ width: `${lineProgress * 100}%` }}
            />
          </div>

          {/* Time */}
          <p className="mt-2 text-xs text-[var(--text-muted)] font-mono-game">
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")} / 2:00
          </p>
        </div>
      )}
    </div>
  );
}

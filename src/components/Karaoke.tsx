"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface LyricLine {
  time: number;
  text: string;
  type?: "chorus" | "bridge" | "shout" | "instrumental";
}

// Timecodes extraits par Whisper (speech-to-text avec word timestamps)
const LYRICS: LyricLine[] = [
  { time: 0.0, text: "♫  ♫  ♫", type: "instrumental" },

  { time: 15.0, text: "Ce soir on joue, ce soir on pense" },
  { time: 18.9, text: "Cent questions pour tester votre intelligence" },
  { time: 22.3, text: "Du trivial jusqu'à l'impossible" },
  { time: 26.0, text: "Seuls les meilleurs seront invincibles" },

  { time: 29.9, text: "Trois, deux, un, c'est parti !", type: "shout" },
  { time: 32.2, text: "Buzzez vite, buzzez bien" },
  { time: 34.2, text: "Le chrono tourne, pas le choix" },
  { time: 36.0, text: "Réfléchissez, appuyez !" },

  { time: 39.7, text: "Lo-gi-que ! Lo-gi-que !", type: "chorus" },
  { time: 41.4, text: "On allume les cerveaux ce soir", type: "chorus" },
  { time: 47.1, text: "Lo-gi-que ! Lo-gi-que !", type: "chorus" },
  { time: 48.8, text: "Qui sera le plus fort, on va voir !", type: "chorus" },

  { time: 51.7, text: "♫  ♫  ♫", type: "instrumental" },

  { time: 52.7, text: "Niveau facile, ça va ça vient" },
  { time: 55.6, text: "Niveau expert, on n'y comprend rien" },
  { time: 59.8, text: "Les points qui montent, le score qui flambe" },
  { time: 63.2, text: "Est-ce que t'as le QI d'un génie ?" },

  { time: 67.2, text: "Plus vite tu buzzes, plus tu gagnes" },
  { time: 69.4, text: "La logique, c'est ton arme" },
  { time: 71.2, text: "Le classement change à chaque instant" },
  { time: 72.9, text: "Qui prend la tête maintenant ?", type: "shout" },

  { time: 75.3, text: "Lo-gi-que ! Lo-gi-que !", type: "chorus" },
  { time: 78.2, text: "On allume les cerveaux ce soir", type: "chorus" },
  { time: 83.5, text: "Lo-gi-que ! Lo-gi-que !", type: "chorus" },
  { time: 85.6, text: "Qui sera le plus fort, on va voir !", type: "chorus" },

  { time: 89.2, text: "Les neurones chauffent...", type: "bridge" },
  { time: 91.0, text: "La pression monte...", type: "bridge" },
  { time: 92.5, text: "Cinq secondes... quatre... trois...", type: "bridge" },

  { time: 96.3, text: "LO-GI-QUE ! LO-GI-QUE !", type: "shout" },
  { time: 99.3, text: "On allume les cerveaux ce soir !", type: "chorus" },
  { time: 105.0, text: "LO-GI-QUE ! LO-GI-QUE !", type: "shout" },
  { time: 106.6, text: "Le champion c'est toi, faut y croire !", type: "chorus" },

  { time: 110.4, text: "♫  ♫  ♫", type: "instrumental" },
];

const TOTAL_DURATION = 120;

export default function KaraokeFullscreen({ onSkip }: { onSkip: () => void }) {
  const [started, setStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [lineIndex, setLineIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
  }, []);

  function start() {
    const audio = new Audio("/audio/theme.mp3");
    audioRef.current = audio;
    audio.addEventListener("ended", () => onSkip());
    audio.play().then(() => {
      setStarted(true);
      rafRef.current = requestAnimationFrame(tick);
    }).catch(() => {
      // Autoplay blocked - start anyway
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

  const currentLine = lineIndex >= 0 ? LYRICS[lineIndex] : null;
  const nextLine = lineIndex + 1 < LYRICS.length ? LYRICS[lineIndex + 1] : null;
  const progressPct = (currentTime / TOTAL_DURATION) * 100;

  // Style par type
  function lineStyle(type?: string, isCurrent?: boolean) {
    if (!isCurrent) return "text-white/20";
    switch (type) {
      case "chorus": return "text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 animate-gradient bg-[length:200%_200%] scale-110";
      case "shout": return "text-yellow-400 scale-115";
      case "bridge": return "text-violet-300 italic scale-105";
      case "instrumental": return "text-white/30";
      default: return "text-white";
    }
  }

  // Splash screen "Appuyez pour commencer"
  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black" onClick={start}>
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/50 via-transparent to-cyan-950/30" />
        <div className="relative z-10 text-center px-6">
          <h1 className="font-display text-6xl md:text-8xl font-bold bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_200%] mb-6">
            LOGIQUE
          </h1>
          <p className="text-xl text-white/60 mb-12">Le jeu de logique ultime</p>
          <button className="px-8 py-4 rounded-2xl bg-white/10 border border-white/20 text-lg font-bold hover:bg-white/20 transition-all animate-pulse-glow">
            Appuyez pour commencer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-black overflow-hidden select-none">
      {/* Background animated */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/80 via-black to-cyan-950/40" />
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
        {currentLine?.type === "chorus" && (
          <div className="absolute inset-0 bg-violet-500/5 transition-all duration-500" />
        )}
        {currentLine?.type === "shout" && (
          <div className="absolute inset-0 bg-yellow-500/5 transition-all duration-300" />
        )}
      </div>

      {/* Title (petit, en haut) */}
      <div className="relative z-10 pt-6 text-center">
        <p className="text-sm tracking-[0.3em] text-white/30 uppercase">Logique &mdash; Le G&eacute;n&eacute;rique</p>
      </div>

      {/* Lyrics zone — centre de l'ecran */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {/* Lignes precedentes (defilent vers le haut, de plus en plus transparentes) */}
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

      {/* Bottom bar */}
      <div className="relative z-10 pb-6 px-6">
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500 rounded-full transition-all duration-100" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="flex items-center justify-between">
          {/* Time */}
          <span className="text-sm font-mono-game text-white/30">
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
            <span className="text-white/15"> / 2:00</span>
          </span>

          {/* Equalizer */}
          <div className="flex gap-[3px] items-end h-5">
            {[0,1,2,3,4,5,6].map((i) => (
              <div key={i} className="w-[3px] rounded-full bg-gradient-to-t from-violet-500 to-cyan-400 animate-pulse"
                style={{
                  height: `${6 + (currentLine?.type === "chorus" ? 14 : currentLine?.type === "shout" ? 12 : 8) * Math.random()}px`,
                  animationDelay: `${i * 80}ms`,
                  animationDuration: `${300 + i * 50}ms`,
                }} />
            ))}
          </div>

          {/* Skip button */}
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

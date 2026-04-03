"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KaraokeFullscreen from "@/components/Karaoke";
import type { QuizType } from "@/lib/types";
import { getQuizConfig } from "@/lib/quiz-config";

type Mode = "home" | "party-create" | "remote-create" | "remote-join";

export default function Home() {
  const router = useRouter();
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizType | null>(null);
  const [mode, setMode] = useState<Mode>("home");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const quizConfig = selectedQuiz ? getQuizConfig(selectedQuiz) : null;

  function selectQuiz(quiz: QuizType) {
    const config = getQuizConfig(quiz);
    if (config.hasKaraoke) {
      setSelectedQuiz(quiz);
      setShowKaraoke(true);
    } else {
      setSelectedQuiz(quiz);
    }
  }

  async function handleCreate(gameMode: "party" | "remote") {
    if (!name.trim()) return setError("Entrez votre nom");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name.trim(), mode: gameMode, quizType: selectedQuiz }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`player_${data.roomCode}`, data.playerId);
      sessionStorage.setItem(`token_${data.roomCode}`, data.token);
      sessionStorage.setItem(`name_${data.roomCode}`, name.trim());
      sessionStorage.setItem(`isHost_${data.roomCode}`, "true");
      if (gameMode === "party") router.push(`/screen/${data.roomCode}`);
      else router.push(`/play/${data.roomCode}?p=${data.playerId}&t=${data.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) return setError("Entrez votre nom");
    if (!roomCode.trim() || roomCode.trim().length < 4) return setError("Code invalide");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: roomCode.trim(), playerName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem(`player_${data.roomCode}`, data.playerId);
      sessionStorage.setItem(`token_${data.roomCode}`, data.token);
      sessionStorage.setItem(`name_${data.roomCode}`, name.trim());
      router.push(`/play/${data.roomCode}?p=${data.playerId}&t=${data.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  function back() {
    if (mode !== "home") {
      setMode("home");
      setError("");
    } else {
      setSelectedQuiz(null);
      setError("");
    }
  }

  // Karaoke (uniquement pour les quiz qui en ont un)
  if (showKaraoke) {
    return <KaraokeFullscreen onSkip={() => setShowKaraoke(false)} />;
  }

  // === ETAPE 1 : CHOIX DU QUIZ ===
  if (!selectedQuiz) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-[var(--text-secondary)] mb-6 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Quiz multijoueur
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
              QUIZZARENA
            </h1>
            <p className="mt-3 text-[var(--text-secondary)] text-lg">
              Choisissez votre d&eacute;fi
            </p>
          </div>

          <div className="space-y-4 animate-slide-up">
            {/* Logique */}
            <button onClick={() => selectQuiz("logique")}
              className="w-full group relative overflow-hidden rounded-2xl glass-strong p-6 text-left transition-all hover:border-violet-500/30">
              <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-500/20 transition" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">&#x1f9e0;</span>
                  <div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">LOGIQUE</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">Du trivial &agrave; l&apos;impossible</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-3">100 questions de logique pure : suites, d&eacute;ductions, patterns, probabilit&eacute;s...</p>
              </div>
            </button>

            {/* Actualite 2025 */}
            <button onClick={() => selectQuiz("actualite")}
              className="w-full group relative overflow-hidden rounded-2xl glass-strong p-6 text-left transition-all hover:border-amber-500/30">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/20 transition" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">&#x1f4f0;</span>
                  <div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-rose-300 to-amber-400 bg-clip-text text-transparent">ACTU 2025</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">Testez vos connaissances de l&apos;ann&eacute;e</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-3">100 questions sur l&apos;actualit&eacute; 2025 : politique, sport, tech, culture, science...</p>
              </div>
            </button>

            {/* Rejoindre */}
            <button onClick={() => setMode("remote-join")}
              className="w-full rounded-2xl glass p-4 text-center text-[var(--text-secondary)] hover:text-white hover:border-white/20 transition-all">
              Rejoindre une partie
            </button>
          </div>

          <p className="text-center text-[var(--text-muted)] text-xs mt-6">
            1 &agrave; 8 joueurs &middot; Navigateur web &middot; Aucune installation
          </p>

          {/* JOIN direct depuis l'accueil */}
          {mode === "remote-join" && !selectedQuiz && (
            <div className="mt-6 space-y-4 animate-slide-up">
              <div className="h-px bg-white/10" />
              <input type="text" placeholder="Votre nom" value={name} onChange={(e) => setName(e.target.value)} maxLength={20}
                className="w-full px-5 py-4 rounded-xl glass text-lg placeholder:text-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50 transition" autoFocus />
              <input type="text" placeholder="Code (ex: BXKF)" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && handleJoin()} maxLength={4}
                className="w-full px-5 py-4 rounded-xl glass text-2xl text-center tracking-[0.4em] font-mono-game uppercase placeholder:text-[var(--text-muted)] placeholder:tracking-normal placeholder:text-lg focus:outline-none focus:border-cyan-500/50 transition" />
              <button onClick={handleJoin} disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-lg font-bold disabled:opacity-50 transition-all btn-glow">
                {loading ? "Connexion..." : "Rejoindre"}
              </button>
              <button onClick={() => setMode("home")} className="w-full py-3 text-[var(--text-muted)] hover:text-white transition text-sm">Retour</button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center text-red-400 text-sm animate-slide-up">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === ETAPE 2 : CHOIX DU MODE + CREATION/JOIN ===
  const accentBorder = selectedQuiz === "actualite" ? "hover:border-amber-500/30" : "hover:border-violet-500/30";
  const accentGlow = selectedQuiz === "actualite" ? "bg-amber-500/10 group-hover:bg-amber-500/20" : "bg-violet-500/10 group-hover:bg-violet-500/20";
  const accentGlow2 = selectedQuiz === "actualite" ? "bg-rose-500/10 group-hover:bg-rose-500/20" : "bg-cyan-500/10 group-hover:bg-cyan-500/20";
  const accentBorder2 = selectedQuiz === "actualite" ? "hover:border-rose-500/30" : "hover:border-cyan-500/30";
  const btnGradient = selectedQuiz === "actualite" ? "from-amber-600 to-rose-600" : "from-violet-600 to-indigo-600";
  const btnGradient2 = selectedQuiz === "actualite" ? "from-rose-600 to-pink-600" : "from-cyan-600 to-blue-600";
  const focusBorder = selectedQuiz === "actualite" ? "focus:border-amber-500/50" : "focus:border-violet-500/50";
  const focusBorder2 = selectedQuiz === "actualite" ? "focus:border-rose-500/50" : "focus:border-cyan-500/50";

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-[var(--text-secondary)] mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {quizConfig?.badgeText}
          </div>
          <h1 className={`font-display text-6xl font-bold tracking-tight bg-gradient-to-r ${quizConfig?.gradientFrom} ${quizConfig?.gradientVia} ${quizConfig?.gradientTo} bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]`}>
            {quizConfig?.name}
          </h1>
          <p className="mt-3 text-[var(--text-secondary)] text-lg">
            {quizConfig?.subtitle}
          </p>
        </div>

        {/* === MODE SELECTION === */}
        {mode === "home" && (
          <div className="space-y-3 animate-slide-up">
            <button onClick={() => setMode("party-create")}
              className={`w-full group relative overflow-hidden rounded-2xl glass-strong p-5 text-left transition-all ${accentBorder}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${accentGlow} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition`} />
              <div className="relative">
                <span className="text-2xl">&#x1f389;</span>
                <p className="text-xl font-bold mt-2">Mode Soir&eacute;e</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">1 grand &eacute;cran + t&eacute;l&eacute;phones comme manettes</p>
              </div>
            </button>

            <button onClick={() => setMode("remote-create")}
              className={`w-full group relative overflow-hidden rounded-2xl glass-strong p-5 text-left transition-all ${accentBorder2}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${accentGlow2} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition`} />
              <div className="relative">
                <span className="text-2xl">&#x1f310;</span>
                <p className="text-xl font-bold mt-2">Mode &Agrave; distance</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Chaque joueur sur son propre &eacute;cran</p>
              </div>
            </button>

            <button onClick={() => setMode("remote-join")}
              className="w-full rounded-2xl glass p-4 text-center text-[var(--text-secondary)] hover:text-white hover:border-white/20 transition-all">
              Rejoindre une partie
            </button>

            <button onClick={back} className="w-full py-3 text-[var(--text-muted)] hover:text-white transition text-sm">
              &larr; Changer de quiz
            </button>
          </div>
        )}

        {/* === CREATE PARTY === */}
        {mode === "party-create" && (
          <div className="space-y-4 animate-slide-up">
            <div className="glass rounded-xl p-3 text-center text-sm text-[var(--text-secondary)]">
              &#x1f389; <strong className="text-white">Mode Soir&eacute;e</strong> &mdash; Ouvrez sur un grand &eacute;cran
            </div>
            <input type="text" placeholder="Nom de l'organisateur" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate("party")} maxLength={20}
              className={`w-full px-5 py-4 rounded-xl glass text-lg placeholder:text-[var(--text-muted)] focus:outline-none ${focusBorder} transition`} autoFocus />
            <button onClick={() => handleCreate("party")} disabled={loading}
              className={`w-full py-4 rounded-xl bg-gradient-to-r ${btnGradient} text-lg font-bold disabled:opacity-50 transition-all btn-glow`}>
              {loading ? "Cr\u00e9ation..." : "Cr\u00e9er la partie"}
            </button>
            <button onClick={back} className="w-full py-3 text-[var(--text-muted)] hover:text-white transition text-sm">Retour</button>
          </div>
        )}

        {/* === CREATE REMOTE === */}
        {mode === "remote-create" && (
          <div className="space-y-4 animate-slide-up">
            <div className="glass rounded-xl p-3 text-center text-sm text-[var(--text-secondary)]">
              &#x1f310; <strong className="text-white">Mode &Agrave; distance</strong> &mdash; Partagez le code avec vos amis
            </div>
            <input type="text" placeholder="Votre nom" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate("remote")} maxLength={20}
              className={`w-full px-5 py-4 rounded-xl glass text-lg placeholder:text-[var(--text-muted)] focus:outline-none ${focusBorder2} transition`} autoFocus />
            <button onClick={() => handleCreate("remote")} disabled={loading}
              className={`w-full py-4 rounded-xl bg-gradient-to-r ${btnGradient2} text-lg font-bold disabled:opacity-50 transition-all btn-glow`}>
              {loading ? "Cr\u00e9ation..." : "Cr\u00e9er la partie"}
            </button>
            <button onClick={back} className="w-full py-3 text-[var(--text-muted)] hover:text-white transition text-sm">Retour</button>
          </div>
        )}

        {/* === JOIN === */}
        {mode === "remote-join" && (
          <div className="space-y-4 animate-slide-up">
            <input type="text" placeholder="Votre nom" value={name} onChange={(e) => setName(e.target.value)} maxLength={20}
              className={`w-full px-5 py-4 rounded-xl glass text-lg placeholder:text-[var(--text-muted)] focus:outline-none ${focusBorder2} transition`} autoFocus />
            <input type="text" placeholder="Code (ex: BXKF)" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && handleJoin()} maxLength={4}
              className={`w-full px-5 py-4 rounded-xl glass text-2xl text-center tracking-[0.4em] font-mono-game uppercase placeholder:text-[var(--text-muted)] placeholder:tracking-normal placeholder:text-lg focus:outline-none ${focusBorder2} transition`} />
            <button onClick={handleJoin} disabled={loading}
              className={`w-full py-4 rounded-xl bg-gradient-to-r ${btnGradient2} text-lg font-bold disabled:opacity-50 transition-all btn-glow`}>
              {loading ? "Connexion..." : "Rejoindre"}
            </button>
            <button onClick={back} className="w-full py-3 text-[var(--text-muted)] hover:text-white transition text-sm">Retour</button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center text-red-400 text-sm animate-slide-up">
            {error}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[var(--text-muted)] text-xs mt-6">
          1 &agrave; 8 joueurs &middot; Navigateur web &middot; Aucune installation
        </p>
      </div>
    </div>
  );
}

"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { useGameActions } from "@/hooks/useGameActions";
import { useTimer } from "@/hooks/useTimer";

const ANSWER_COLORS = [
  "from-blue-600 to-blue-700 active:from-blue-700 active:to-blue-800",
  "from-orange-500 to-orange-600 active:from-orange-600 active:to-orange-700",
  "from-green-600 to-green-700 active:from-green-700 active:to-green-800",
  "from-purple-600 to-purple-700 active:from-purple-700 active:to-purple-800",
];
const ANSWER_LABELS = ["A", "B", "C", "D"];

export default function PlayPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const router = useRouter();
  const { state, loading, error } = useGameState(roomCode);
  const { submitAnswer } = useGameActions(roomCode);
  const deadline = state?.room?.questionDeadline || 0;
  const { remainingSeconds, isExpired } = useTimer(deadline);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [lastQuestionIndex, setLastQuestionIndex] = useState(-1);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joinName, setJoinName] = useState("");

  // Verifier si le joueur a des credentials
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pid = sessionStorage.getItem(`player_${roomCode}`);
      if (!pid) {
        setNeedsJoin(true);
      }
    }
  }, [roomCode]);

  // Reset la selection quand la question change
  useEffect(() => {
    if (state?.room?.currentQuestionIndex !== undefined && state.room.currentQuestionIndex !== lastQuestionIndex) {
      setSelectedAnswer(null);
      setSubmitting(false);
      setSubmitError("");
      setLastQuestionIndex(state.room.currentQuestionIndex);
    }
  }, [state?.room?.currentQuestionIndex, lastQuestionIndex]);

  // Verifier si deja repondu
  useEffect(() => {
    if (state?.answeredPlayerIds && typeof window !== "undefined") {
      const playerId = sessionStorage.getItem(`player_${roomCode}`);
      if (playerId && state.answeredPlayerIds.includes(playerId)) {
        setSelectedAnswer(-1); // deja repondu
      }
    }
  }, [state?.answeredPlayerIds, roomCode]);

  async function handleJoin() {
    if (!joinName.trim()) return;
    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, playerName: joinName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      sessionStorage.setItem(`player_${data.roomCode}`, data.playerId);
      sessionStorage.setItem(`token_${data.roomCode}`, data.token);
      sessionStorage.setItem(`name_${data.roomCode}`, joinName.trim());
      setNeedsJoin(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleAnswer(index: number) {
    if (selectedAnswer !== null || submitting || isExpired) return;

    setSelectedAnswer(index);
    setSubmitting(true);

    // Vibration feedback
    if (navigator.vibrate) navigator.vibrate(50);

    try {
      const result = await submitAnswer(index);
      if (!result.accepted) {
        setSubmitError(result.error || "Erreur");
        setSelectedAnswer(null);
      }
    } catch {
      setSubmitError("Erreur de connexion");
      setSelectedAnswer(null);
    } finally {
      setSubmitting(false);
    }
  }

  // Ecran de join
  if (needsJoin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold mb-2">Rejoindre</h1>
        <p className="text-gray-400 mb-6">Room: {roomCode}</p>
        <input
          type="text"
          placeholder="Votre nom"
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
          maxLength={20}
          className="w-full max-w-xs px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-lg text-center placeholder:text-gray-500 focus:outline-none focus:border-violet-500 mb-4"
          autoFocus
        />
        <button
          onClick={handleJoin}
          className="w-full max-w-xs py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-lg font-bold"
        >
          Rejoindre
        </button>
        {submitError && <p className="text-red-400 mt-4">{submitError}</p>}
      </div>
    );
  }

  if (loading && !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-400 animate-pulse">Connexion...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-xl text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push("/")} className="text-gray-400 underline">Retour</button>
        </div>
      </div>
    );
  }

  if (!state) return null;
  const { room, currentQuestion, revealData, scores, players } = state;
  const myId = typeof window !== "undefined" ? sessionStorage.getItem(`player_${roomCode}`) : null;
  const myName = typeof window !== "undefined" ? sessionStorage.getItem(`name_${roomCode}`) : null;

  // === LOBBY ===
  if (room.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h2 className="text-2xl font-bold mb-2">{myName}</h2>
        <p className="text-gray-400 text-lg mb-6">Room {roomCode}</p>
        <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">En attente du lancement...</p>
        <p className="text-sm text-gray-600 mt-4">{players.length} joueur{players.length > 1 ? "s" : ""}</p>
      </div>
    );
  }

  // === QUESTION ===
  if (room.status === "playing" && currentQuestion) {
    const alreadyAnswered = selectedAnswer !== null;

    if (alreadyAnswered) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="text-6xl mb-4">✓</div>
          <p className="text-2xl font-bold text-green-400 mb-2">Reponse enregistree !</p>
          <p className="text-gray-400">En attente des autres joueurs...</p>
          <p className="text-5xl font-mono font-bold mt-8 tabular-nums">{remainingSeconds}</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col p-4">
        {/* Header compact */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Q{room.currentQuestionIndex + 1}/{room.totalQuestions}</span>
          <span className="text-3xl font-mono font-bold tabular-nums">{remainingSeconds}</span>
        </div>

        {/* Timer bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full timer-bar ${remainingSeconds > 5 ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${Math.max(0, (remainingSeconds / currentQuestion.time_limit) * 100)}%` }}
          />
        </div>

        {/* Boutons reponse */}
        <div className="flex-1 flex flex-col gap-3 justify-center">
          {currentQuestion.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={isExpired}
              className={`flex-1 min-h-[80px] rounded-2xl bg-gradient-to-r ${ANSWER_COLORS[i]} flex items-center gap-4 px-5 text-left text-lg font-semibold transition-all active:scale-[0.98] disabled:opacity-40`}
            >
              <span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold shrink-0">
                {ANSWER_LABELS[i]}
              </span>
              <span className="leading-tight">{choice}</span>
            </button>
          ))}
        </div>

        {submitError && <p className="text-red-400 text-center mt-2 text-sm">{submitError}</p>}
      </div>
    );
  }

  // === REVEAL ===
  if (room.status === "reveal" && revealData) {
    const myResult = revealData.playerResults.find((r) => r.playerId === myId);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        {myResult?.correct ? (
          <>
            <div className="text-7xl mb-4">🎉</div>
            <p className="text-3xl font-bold text-green-400">Correct !</p>
          </>
        ) : (
          <>
            <div className="text-7xl mb-4">😔</div>
            <p className="text-3xl font-bold text-red-400">Incorrect</p>
          </>
        )}
        <p className="text-gray-400 mt-4">
          Reponse : {ANSWER_LABELS[revealData.correctIndex]}
        </p>
      </div>
    );
  }

  // === FIN ===
  if (room.status === "finished") {
    const myScore = scores.find((s) => s.playerId === myId);
    const myRank = scores.findIndex((s) => s.playerId === myId) + 1;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">{myRank === 1 ? "🏆" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🎮"}</div>
        <p className="text-4xl font-bold mb-2">#{myRank}</p>
        <p className="text-2xl text-gray-400 mb-6">{myScore?.score || 0} points</p>

        <div className="w-full max-w-xs space-y-2">
          {scores.map((s, i) => {
            const p = players.find((pl) => pl.id === s.playerId);
            return (
              <div key={s.playerId} className={`flex items-center gap-3 p-3 rounded-lg ${s.playerId === myId ? "bg-violet-500/20 border border-violet-500/30" : "bg-white/5"}`}>
                <span className="w-6 text-center text-sm">{i + 1}</span>
                <span className="flex-1 text-left">{p?.name}</span>
                <span className="font-mono text-sm">{s.score}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => window.location.href = "/"}
          className="mt-8 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition"
        >
          Nouvelle partie
        </button>
      </div>
    );
  }

  // Default: attente
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">En attente...</p>
      </div>
    </div>
  );
}

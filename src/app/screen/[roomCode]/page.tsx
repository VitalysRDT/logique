"use client";

import { use } from "react";
import { useGameState } from "@/hooks/useGameState";
import { useGameActions } from "@/hooks/useGameActions";
import { useTimer } from "@/hooks/useTimer";
import { QRCodeSVG } from "qrcode.react";

const ANSWER_COLORS = [
  "from-blue-600 to-blue-500",
  "from-orange-600 to-orange-500",
  "from-green-600 to-green-500",
  "from-purple-600 to-purple-500",
];
const ANSWER_LABELS = ["A", "B", "C", "D"];
const DIFFICULTY_LABELS = ["", "Trivial", "Facile", "Facile+", "Moyen-", "Moyen", "Moyen+", "Difficile", "Tres dur", "Expert", "Impossible"];
const DIFFICULTY_COLORS = ["", "text-green-400", "text-green-400", "text-lime-400", "text-yellow-400", "text-yellow-400", "text-orange-400", "text-orange-400", "text-red-400", "text-red-400", "text-red-600"];

export default function ScreenPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const { state, loading, error } = useGameState(roomCode);
  const { hostControl } = useGameActions(roomCode);
  const deadline = state?.room?.questionDeadline || 0;
  const { remainingSeconds, isExpired } = useTimer(deadline);

  const isHost = typeof window !== "undefined" && sessionStorage.getItem(`isHost_${roomCode}`) === "true";

  if (loading && !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-400 animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-red-400">{error}</div>
      </div>
    );
  }

  if (!state) return null;

  const { room, players, scores, currentQuestion, revealData, answeredPlayerIds } = state;
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  // === LOBBY ===
  if (room.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 space-y-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          LOGIQUE
        </h1>

        <div className="flex items-center gap-12">
          {/* Code Room */}
          <div className="text-center">
            <p className="text-gray-400 text-lg mb-2">Code de la partie</p>
            <div className="text-8xl font-mono font-bold tracking-[0.3em] text-white animate-pulse-glow px-8 py-4 rounded-2xl bg-white/5 border border-white/10">
              {roomCode}
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-2xl">
            <QRCodeSVG
              value={`${appUrl}/play/${roomCode}`}
              size={200}
              level="M"
            />
          </div>
        </div>

        <p className="text-gray-400">Scannez le QR code ou entrez le code sur votre telephone</p>

        {/* Joueurs */}
        <div className="flex flex-wrap gap-4 justify-center">
          {players.map((p, i) => (
            <div
              key={p.id}
              className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-lg animate-slide-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {p.avatar} {p.name}
            </div>
          ))}
        </div>

        <p className="text-gray-500">{players.length} joueur{players.length > 1 ? "s" : ""} connecte{players.length > 1 ? "s" : ""}</p>

        {isHost && players.length >= 2 && (
          <button
            onClick={() => hostControl("start")}
            className="px-12 py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-2xl font-bold hover:from-violet-500 hover:to-indigo-500 transition-all animate-pulse-glow"
          >
            Commencer la partie
          </button>
        )}

        {isHost && players.length < 2 && (
          <p className="text-yellow-400">En attente d&apos;au moins 2 joueurs...</p>
        )}
      </div>
    );
  }

  // === QUESTION EN COURS ===
  if (room.status === "playing" && currentQuestion) {
    const qNum = room.currentQuestionIndex + 1;
    const diff = currentQuestion.difficulty;
    const timeLimitSec = currentQuestion.time_limit;
    const progressPct = timeLimitSec > 0 ? Math.max(0, (remainingSeconds / timeLimitSec) * 100) : 0;
    const timerColor = remainingSeconds > timeLimitSec * 0.5 ? "bg-green-500" : remainingSeconds > timeLimitSec * 0.2 ? "bg-yellow-500" : "bg-red-500";

    return (
      <div className="min-h-screen flex flex-col p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-lg text-gray-400">
            Question {qNum} / {room.totalQuestions}
          </div>
          <div className={`text-lg font-bold ${DIFFICULTY_COLORS[diff]}`}>
            {DIFFICULTY_LABELS[diff]} (Niv. {diff})
          </div>
          <div className="text-4xl font-mono font-bold tabular-nums">
            {remainingSeconds}
          </div>
        </div>

        {/* Timer Bar */}
        <div className="w-full h-2 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div className={`h-full rounded-full timer-bar ${timerColor}`} style={{ width: `${progressPct}%` }} />
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <h2 className="text-3xl font-bold text-center mb-12 leading-relaxed">
            {currentQuestion.text}
          </h2>

          {/* Choices (reference, non-cliquable) */}
          <div className="grid grid-cols-2 gap-4 w-full">
            {currentQuestion.choices.map((choice, i) => (
              <div
                key={i}
                className={`p-6 rounded-xl bg-gradient-to-r ${ANSWER_COLORS[i]} flex items-center gap-4 text-xl`}
              >
                <span className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-2xl">
                  {ANSWER_LABELS[i]}
                </span>
                <span>{choice}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Joueurs qui ont repondu */}
        <div className="flex gap-3 justify-center mt-8">
          {players.map((p) => {
            const answered = answeredPlayerIds?.includes(p.id);
            return (
              <div
                key={p.id}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  answered
                    ? "bg-green-500/20 border border-green-500/50 text-green-400"
                    : "bg-white/5 border border-white/10 text-gray-500"
                }`}
              >
                {p.avatar} {p.name} {answered && "✓"}
              </div>
            );
          })}
        </div>

        {/* Host: forcer next si timer expire */}
        {isHost && isExpired && (
          <button
            onClick={() => hostControl("next")}
            className="mt-4 mx-auto px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold transition"
          >
            Voir la reponse
          </button>
        )}
      </div>
    );
  }

  // === REVEAL ===
  if (room.status === "reveal" && currentQuestion && revealData) {
    return (
      <div className="min-h-screen flex flex-col p-8">
        <div className="text-lg text-gray-400 mb-4">
          Question {room.currentQuestionIndex + 1} / {room.totalQuestions}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <h2 className="text-2xl font-bold text-center mb-8">{currentQuestion.text}</h2>

          {/* Choices avec highlight */}
          <div className="grid grid-cols-2 gap-4 w-full mb-8">
            {currentQuestion.choices.map((choice, i) => {
              const isCorrect = i === revealData.correctIndex;
              return (
                <div
                  key={i}
                  className={`p-6 rounded-xl flex items-center gap-4 text-xl border-2 transition-all ${
                    isCorrect
                      ? "bg-green-500/20 border-green-500 text-green-300"
                      : "bg-white/5 border-white/10 text-gray-500"
                  }`}
                >
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-2xl ${isCorrect ? "bg-green-500 text-white" : "bg-white/10"}`}>
                    {ANSWER_LABELS[i]}
                  </span>
                  <span>{choice}</span>
                  {isCorrect && <span className="ml-auto text-2xl">✓</span>}
                </div>
              );
            })}
          </div>

          {/* Explication */}
          <div className="w-full p-6 rounded-xl bg-violet-500/10 border border-violet-500/30 mb-8">
            <p className="text-violet-300 font-bold mb-2">Explication :</p>
            <p className="text-gray-300 text-lg leading-relaxed">{revealData.explanation}</p>
          </div>

          {/* Resultats des joueurs */}
          <div className="flex flex-wrap gap-3 justify-center">
            {revealData.playerResults.map((pr) => (
              <div
                key={pr.playerId}
                className={`px-5 py-3 rounded-xl text-lg ${
                  pr.correct
                    ? "bg-green-500/20 border border-green-500/30 text-green-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {pr.playerName}: {pr.correct ? "✓" : "✗"}
                {pr.chosenIndex !== null && ` (${ANSWER_LABELS[pr.chosenIndex]})`}
                {pr.chosenIndex === null && " (pas de reponse)"}
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <button
            onClick={() => hostControl("next")}
            className="mt-6 mx-auto px-12 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-xl font-bold hover:from-violet-500 hover:to-indigo-500 transition-all"
          >
            Question suivante
          </button>
        )}
      </div>
    );
  }

  // === LEADERBOARD / BETWEEN QUESTIONS ===
  if (room.status === "leaderboard") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h2 className="text-4xl font-bold mb-12">Classement</h2>
        <div className="w-full max-w-lg space-y-3">
          {scores.map((s, i) => {
            const player = players.find((p) => p.id === s.playerId);
            return (
              <div
                key={s.playerId}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="text-3xl font-bold w-10 text-center">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </span>
                <span className="text-xl flex-1">{player?.avatar} {player?.name}</span>
                <span className="text-2xl font-mono font-bold text-violet-400">{s.score}</span>
              </div>
            );
          })}
        </div>
        {isHost && (
          <button
            onClick={() => hostControl("next")}
            className="mt-8 px-12 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-xl font-bold hover:from-violet-500 hover:to-indigo-500 transition-all"
          >
            Continuer
          </button>
        )}
      </div>
    );
  }

  // === FIN DE PARTIE ===
  if (room.status === "finished") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Confettis */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-sm animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308"][i % 5],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}

        <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
          Partie terminee !
        </h2>

        {/* Podium */}
        <div className="flex items-end gap-4 mb-12 mt-8">
          {scores.length >= 2 && (
            <div className="text-center">
              <p className="text-xl mb-2">{players.find((p) => p.id === scores[1].playerId)?.name}</p>
              <div className="w-28 h-28 bg-gray-400/20 rounded-t-xl flex items-center justify-center text-4xl">🥈</div>
              <p className="text-lg font-mono text-gray-400">{scores[1].score}</p>
            </div>
          )}
          {scores.length >= 1 && (
            <div className="text-center">
              <p className="text-2xl font-bold mb-2">{players.find((p) => p.id === scores[0].playerId)?.name}</p>
              <div className="w-32 h-40 bg-yellow-500/20 rounded-t-xl flex items-center justify-center text-5xl">🥇</div>
              <p className="text-xl font-mono font-bold text-yellow-400">{scores[0].score}</p>
            </div>
          )}
          {scores.length >= 3 && (
            <div className="text-center">
              <p className="text-xl mb-2">{players.find((p) => p.id === scores[2].playerId)?.name}</p>
              <div className="w-28 h-20 bg-orange-700/20 rounded-t-xl flex items-center justify-center text-4xl">🥉</div>
              <p className="text-lg font-mono text-orange-400">{scores[2].score}</p>
            </div>
          )}
        </div>

        {/* Classement complet */}
        <div className="w-full max-w-lg space-y-2">
          {scores.slice(3).map((s, i) => {
            const player = players.find((p) => p.id === s.playerId);
            return (
              <div key={s.playerId} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                <span className="text-gray-500 w-8 text-center">{i + 4}</span>
                <span className="flex-1">{player?.name}</span>
                <span className="font-mono text-gray-400">{s.score}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => window.location.href = "/"}
          className="mt-8 px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition"
        >
          Nouvelle partie
        </button>
      </div>
    );
  }

  return null;
}

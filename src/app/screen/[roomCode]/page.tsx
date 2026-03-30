"use client";

import { use, useState, useEffect, useRef, useMemo } from "react";
import { useGameState } from "@/hooks/useGameState";
import { useGameActions } from "@/hooks/useGameActions";
import { useTimer } from "@/hooks/useTimer";
import { useAudio } from "@/hooks/useAudio";
import { QRCodeSVG } from "qrcode.react";
import {
  rulesIntro,
  questionIntro,
  revealComment,
  gameOverComment,
} from "@/lib/commentary";

const ANSWER_COLORS = [
  "from-blue-600 to-blue-500",
  "from-orange-600 to-orange-500",
  "from-green-600 to-green-500",
  "from-purple-600 to-purple-500",
];
const ANSWER_LABELS = ["A", "B", "C", "D"];
const DIFFICULTY_LABELS = ["", "Trivial", "Facile", "Facile+", "Moyen-", "Moyen", "Moyen+", "Difficile", "Tres dur", "Expert", "Impossible"];
const DIFFICULTY_COLORS = ["", "text-green-400", "text-green-400", "text-lime-400", "text-yellow-400", "text-yellow-400", "text-orange-400", "text-orange-400", "text-red-400", "text-red-400", "text-red-600"];
const PLAYER_AVATARS = ["🎮", "🎯", "🚀", "⚡", "🔥", "💎", "🌟", "🎪"];

export default function ScreenPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const { state, loading, error } = useGameState(roomCode);
  const { hostControl } = useGameActions(roomCode);
  const deadline = state?.room?.questionDeadline || 0;
  const { remainingSeconds, isExpired } = useTimer(deadline);

  // State pour ajouter des joueurs sur l'ecran TV
  const [newPlayerName, setNewPlayerName] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addError, setAddError] = useState("");
  // Map playerId -> {playerId, token} pour les QR codes
  const [playerCredentials, setPlayerCredentials] = useState<Record<string, { playerId: string; token: string }>>({});

  const { speak, speakNow, stop } = useAudio();
  const lastSpokenRef = useRef<string>("");
  const isHost = typeof window !== "undefined" && sessionStorage.getItem(`isHost_${roomCode}`) === "true";
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  // === AUDIO : declencher les commentaires selon l'etat ===
  useEffect(() => {
    if (!state) return;
    const { room, players, currentQuestion, revealData, scores } = state;
    const key = `${room.status}-${room.currentQuestionIndex}`;
    if (key === lastSpokenRef.current) return;
    lastSpokenRef.current = key;

    if (room.status === "playing" && currentQuestion) {
      const qNum = room.currentQuestionIndex + 1;
      if (qNum === 1) {
        // Intro regles + premiere question
        const names = players.map((p) => p.name);
        speakNow(rulesIntro(names));
        speak(questionIntro(qNum, room.totalQuestions, currentQuestion.difficulty, currentQuestion.text));
      } else {
        speakNow(questionIntro(qNum, room.totalQuestions, currentQuestion.difficulty, currentQuestion.text));
      }
    } else if (room.status === "reveal" && revealData && currentQuestion) {
      const correctAnswer = currentQuestion.choices[revealData.correctIndex];
      speakNow(revealComment(correctAnswer, revealData.explanation, revealData.playerResults));
    } else if (room.status === "finished" && scores.length > 0) {
      const named = scores.map((s) => ({
        playerName: players.find((p) => p.id === s.playerId)?.name || "?",
        score: s.score,
      }));
      speakNow(gameOverComment(named));
    }
  }, [state, speak, speakNow]);

  // Stop audio on unmount
  useEffect(() => () => stop(), [stop]);

  // Charger les credentials du host au mount
  useMemo(() => {
    if (typeof window === "undefined") return;
    const hostId = sessionStorage.getItem(`player_${roomCode}`);
    const hostToken = sessionStorage.getItem(`token_${roomCode}`);
    if (hostId && hostToken) {
      setPlayerCredentials((prev) => ({ ...prev, [hostId]: { playerId: hostId, token: hostToken } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  async function handleAddPlayer() {
    if (!newPlayerName.trim()) return;
    setAddingPlayer(true);
    setAddError("");

    try {
      const avatar = PLAYER_AVATARS[(state?.players?.length || 0) % PLAYER_AVATARS.length];
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, playerName: newPlayerName.trim(), avatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Stocker les credentials pour generer le QR code
      setPlayerCredentials((prev) => ({
        ...prev,
        [data.playerId]: { playerId: data.playerId, token: data.token },
      }));
      setNewPlayerName("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAddingPlayer(false);
    }
  }

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

  // Detecter quels joueurs ont connecte leur telephone
  // Un joueur a "scanne" = son telephone poll le state (on le detecte via un champ)
  // Pour simplifier : on considere que si le joueur a des credentials dans notre map, son QR est pret
  const allPlayersHaveQR = players.every((p) => playerCredentials[p.id]);

  // === LOBBY : Ajouter joueurs + QR codes ===
  if (room.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-8">
          LOGIQUE
        </h1>

        {/* Zone ajout joueurs */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nom du joueur..."
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
              maxLength={20}
              className="flex-1 px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-lg placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
              autoFocus
            />
            <button
              onClick={handleAddPlayer}
              disabled={addingPlayer}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-lg font-bold disabled:opacity-50 hover:from-cyan-500 hover:to-blue-500 transition-all whitespace-nowrap"
            >
              + Ajouter
            </button>
          </div>
          {addError && <p className="text-red-400 mt-2 text-sm">{addError}</p>}
        </div>

        {/* Liste des joueurs avec QR codes */}
        {players.length > 0 && (
          <div className="w-full max-w-4xl">
            <p className="text-gray-400 text-center mb-4">
              Chaque joueur scanne SON QR code avec son telephone
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {players.map((p) => {
                const creds = playerCredentials[p.id];
                const qrUrl = creds
                  ? `${appUrl}/play/${roomCode}?p=${creds.playerId}&t=${creds.token}`
                  : "";

                return (
                  <div
                    key={p.id}
                    className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10 animate-slide-up"
                  >
                    <p className="text-lg font-bold mb-3">
                      {p.avatar} {p.name}
                    </p>
                    {qrUrl ? (
                      <div className="bg-white p-3 rounded-xl">
                        <QRCodeSVG value={qrUrl} size={140} level="M" />
                      </div>
                    ) : (
                      <div className="w-[164px] h-[164px] bg-white/10 rounded-xl flex items-center justify-center text-gray-500 text-sm">
                        QR en cours...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-gray-500 mt-6">
          {players.length} joueur{players.length > 1 ? "s" : ""} inscrit{players.length > 1 ? "s" : ""}
        </p>

        {/* Bouton demarrer */}
        {isHost && players.length >= 2 && allPlayersHaveQR && (
          <button
            onClick={() => hostControl("start")}
            className="mt-6 px-12 py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-2xl font-bold hover:from-violet-500 hover:to-indigo-500 transition-all animate-pulse-glow"
          >
            Lancer la partie !
          </button>
        )}

        {players.length < 2 && players.length > 0 && (
          <p className="mt-4 text-yellow-400">Ajoutez au moins 1 autre joueur pour commencer</p>
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

          {/* Choices (reference sur l'ecran) */}
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

        {/* Qui a repondu */}
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

          {/* Resultats joueurs */}
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
                {pr.chosenIndex === null && " (pas repondu)"}
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

  // === FIN DE PARTIE ===
  if (room.status === "finished") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Confettis */}
        {Array.from({ length: 40 }).map((_, i) => (
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

        {scores.length > 3 && (
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
        )}

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

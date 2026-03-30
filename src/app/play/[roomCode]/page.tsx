"use client";

import { Suspense, use, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { useGameActions } from "@/hooks/useGameActions";
import { useTimer } from "@/hooks/useTimer";

const ANSWER_COLORS_DISPLAY = [
  "from-blue-600 to-blue-500",
  "from-orange-600 to-orange-500",
  "from-green-600 to-green-500",
  "from-purple-600 to-purple-500",
];
const ANSWER_COLORS_BTN = [
  "from-blue-600 to-blue-700 active:from-blue-700 active:to-blue-800",
  "from-orange-500 to-orange-600 active:from-orange-600 active:to-orange-700",
  "from-green-600 to-green-700 active:from-green-700 active:to-green-800",
  "from-purple-600 to-purple-700 active:from-purple-700 active:to-purple-800",
];
const ANSWER_LABELS = ["A", "B", "C", "D"];
const DIFFICULTY_LABELS = ["", "Trivial", "Facile", "Facile+", "Moyen-", "Moyen", "Moyen+", "Difficile", "Tres dur", "Expert", "Impossible"];
const DIFFICULTY_COLORS = ["", "text-green-400", "text-green-400", "text-lime-400", "text-yellow-400", "text-yellow-400", "text-orange-400", "text-orange-400", "text-red-400", "text-red-400", "text-red-600"];

export default function PlayPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <PlayContent roomCode={roomCode} />
    </Suspense>
  );
}

function PlayContent({ roomCode }: { roomCode: string }) {
  const searchParams = useSearchParams();
  const { state, loading, error } = useGameState(roomCode);
  const { submitAnswer, hostControl, getCredentials } = useGameActions(roomCode);
  const deadline = state?.room?.questionDeadline || 0;
  const { remainingSeconds, isExpired } = useTimer(deadline);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [lastQuestionIndex, setLastQuestionIndex] = useState(-1);
  const [ready, setReady] = useState(false);

  // Credentials depuis URL (QR code) ou sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pFromUrl = searchParams.get("p");
    const tFromUrl = searchParams.get("t");
    if (pFromUrl && tFromUrl) {
      sessionStorage.setItem(`player_${roomCode}`, pFromUrl);
      sessionStorage.setItem(`token_${roomCode}`, tFromUrl);
      setReady(true);
    } else if (sessionStorage.getItem(`player_${roomCode}`)) {
      setReady(true);
    }
  }, [roomCode, searchParams]);

  // Reset quand la question change
  useEffect(() => {
    if (state?.room?.currentQuestionIndex !== undefined && state.room.currentQuestionIndex !== lastQuestionIndex) {
      setSelectedAnswer(null);
      setSubmitting(false);
      setSubmitError("");
      setLastQuestionIndex(state.room.currentQuestionIndex);
    }
  }, [state?.room?.currentQuestionIndex, lastQuestionIndex]);

  // Deja repondu ?
  useEffect(() => {
    if (state?.answeredPlayerIds && typeof window !== "undefined") {
      const playerId = sessionStorage.getItem(`player_${roomCode}`);
      if (playerId && state.answeredPlayerIds.includes(playerId)) {
        setSelectedAnswer(-1);
      }
    }
  }, [state?.answeredPlayerIds, roomCode]);

  async function handleAnswer(index: number) {
    if (selectedAnswer !== null || submitting || isExpired) return;
    setSelectedAnswer(index);
    setSubmitting(true);
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

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Connexion...</p>
      </div>
    );
  }

  if (loading && !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-400 animate-pulse">Connexion a la partie...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-xl text-red-400">{error}</p>
      </div>
    );
  }

  if (!state) return null;

  const { room, currentQuestion, revealData, scores, players, answeredPlayerIds } = state;
  const myId = typeof window !== "undefined" ? sessionStorage.getItem(`player_${roomCode}`) : null;
  const isHost = typeof window !== "undefined" && (sessionStorage.getItem(`isHost_${roomCode}`) === "true" || myId === room.hostId);
  const myPlayer = players.find((p) => p.id === myId);
  const isRemote = room.mode === "remote";

  // ================================================================
  // MODE REMOTE : affichage complet (question + boutons + resultats)
  // ================================================================
  if (isRemote) {
    return (
      <RemoteView
        room={room}
        players={players}
        scores={scores}
        currentQuestion={currentQuestion ?? null}
        revealData={revealData ?? null}
        answeredPlayerIds={answeredPlayerIds ?? []}
        myId={myId}
        myPlayer={myPlayer ?? null}
        isHost={isHost}
        roomCode={roomCode}
        remainingSeconds={remainingSeconds}
        isExpired={isExpired}
        selectedAnswer={selectedAnswer}
        submitError={submitError}
        handleAnswer={handleAnswer}
        hostControl={hostControl}
      />
    );
  }

  // ================================================================
  // MODE PARTY : telecommande simple (boutons seulement)
  // ================================================================

  // LOBBY
  if (room.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">{myPlayer?.avatar || "🎮"}</div>
        <h2 className="text-3xl font-bold mb-2">{myPlayer?.name || "Joueur"}</h2>
        <p className="text-gray-400 text-lg mb-8">Telephone connecte !</p>
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-green-400 font-medium">Pret a jouer</p>
        <p className="text-sm text-gray-600 mt-4">En attente du lancement sur l&apos;ecran...</p>
      </div>
    );
  }

  // QUESTION (telecommande)
  if (room.status === "playing" && currentQuestion) {
    if (selectedAnswer !== null) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="text-7xl mb-4">✓</div>
          <p className="text-2xl font-bold text-green-400 mb-2">Reponse envoyee !</p>
          <p className="text-gray-400">En attente des autres...</p>
          <p className="text-5xl font-mono font-bold mt-8 tabular-nums">{remainingSeconds}</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Q{room.currentQuestionIndex + 1}/{room.totalQuestions}</span>
          <span className="text-3xl font-mono font-bold tabular-nums">{remainingSeconds}</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
          <div className={`h-full rounded-full timer-bar ${remainingSeconds > 5 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.max(0, (remainingSeconds / currentQuestion.time_limit) * 100)}%` }} />
        </div>
        <div className="flex-1 flex flex-col gap-3 justify-center">
          {currentQuestion.choices.map((choice, i) => (
            <button key={i} onClick={() => handleAnswer(i)} disabled={isExpired}
              className={`flex-1 min-h-[80px] rounded-2xl bg-gradient-to-r ${ANSWER_COLORS_BTN[i]} flex items-center gap-4 px-5 text-left text-lg font-semibold transition-all active:scale-[0.98] disabled:opacity-40`}>
              <span className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold shrink-0">{ANSWER_LABELS[i]}</span>
              <span className="leading-tight">{choice}</span>
            </button>
          ))}
        </div>
        {submitError && <p className="text-red-400 text-center mt-2 text-sm">{submitError}</p>}
      </div>
    );
  }

  // REVEAL (telecommande)
  if (room.status === "reveal" && revealData) {
    const myResult = revealData.playerResults.find((r) => r.playerId === myId);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        {myResult?.correct ? (
          <><div className="text-8xl mb-4">🎉</div><p className="text-4xl font-bold text-green-400">Correct !</p></>
        ) : (
          <><div className="text-8xl mb-4">😔</div><p className="text-4xl font-bold text-red-400">Incorrect</p></>
        )}
        <p className="text-gray-400 mt-6 text-lg">Reponse : <span className="text-white font-bold">{ANSWER_LABELS[revealData.correctIndex]}</span></p>
      </div>
    );
  }

  // FIN (telecommande)
  if (room.status === "finished") {
    const myScore = scores.find((s) => s.playerId === myId);
    const myRank = scores.findIndex((s) => s.playerId === myId) + 1;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-7xl mb-4">{myRank === 1 ? "🏆" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🎮"}</div>
        <p className="text-5xl font-bold mb-2">#{myRank}</p>
        <p className="text-2xl text-gray-400 mb-8">{myScore?.score || 0} points</p>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ====================================================================
// REMOTE VIEW : ecran complet avec question + boutons + host controls
// ====================================================================
function RemoteView({
  room, players, scores, currentQuestion, revealData, answeredPlayerIds,
  myId, myPlayer, isHost, roomCode, remainingSeconds, isExpired,
  selectedAnswer, submitError, handleAnswer, hostControl,
}: {
  room: { status: string; currentQuestionIndex: number; totalQuestions: number; hostId: string; roomCode: string; questionDeadline: number; timeLimitSeconds: number };
  players: { id: string; name: string; avatar: string; score: number }[];
  scores: { playerId: string; score: number }[];
  currentQuestion: { difficulty: number; text: string; choices: string[]; time_limit: number; category: string; type: string; id: number; svg_config: unknown } | null;
  revealData: { correctIndex: number; explanation: string; playerResults: { playerId: string; playerName: string; chosenIndex: number | null; correct: boolean; pointsEarned: number; totalScore: number }[] } | null;
  answeredPlayerIds: string[];
  myId: string | null;
  myPlayer: { id: string; name: string; avatar: string } | null;
  isHost: boolean;
  roomCode: string;
  remainingSeconds: number;
  isExpired: boolean;
  selectedAnswer: number | null;
  submitError: string;
  handleAnswer: (i: number) => void;
  hostControl: (action: "start" | "next" | "end") => Promise<unknown>;
}) {

  // LOBBY remote : afficher le code + joueurs + host start
  if (room.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-6">LOGIQUE</h1>

        <div className="mb-6">
          <p className="text-gray-400 mb-2">Code de la partie :</p>
          <div className="text-6xl font-mono font-bold tracking-[0.3em] text-white animate-pulse-glow px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
            {roomCode}
          </div>
          <p className="text-sm text-gray-500 mt-2">Partagez ce code avec vos amis</p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {players.map((p, i) => (
            <div key={p.id} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              {p.avatar} {p.name} {p.id === myId && <span className="text-violet-400">(vous)</span>}
            </div>
          ))}
        </div>

        <p className="text-gray-500 mb-4">{players.length} joueur{players.length > 1 ? "s" : ""}</p>

        {isHost && players.length >= 2 && (
          <button onClick={() => hostControl("start")}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-xl font-bold hover:from-violet-500 hover:to-indigo-500 transition-all animate-pulse-glow">
            Lancer la partie !
          </button>
        )}
        {isHost && players.length < 2 && (
          <p className="text-yellow-400">En attente d&apos;au moins 2 joueurs...</p>
        )}
        {!isHost && (
          <><div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-3" /><p className="text-green-400">Pret ! En attente du lancement...</p></>
        )}
      </div>
    );
  }

  // QUESTION remote : question + boutons cliquables
  if (room.status === "playing" && currentQuestion) {
    const qNum = room.currentQuestionIndex + 1;
    const diff = currentQuestion.difficulty;
    const timeLimitSec = currentQuestion.time_limit;
    const progressPct = timeLimitSec > 0 ? Math.max(0, (remainingSeconds / timeLimitSec) * 100) : 0;
    const timerColor = remainingSeconds > timeLimitSec * 0.5 ? "bg-green-500" : remainingSeconds > timeLimitSec * 0.2 ? "bg-yellow-500" : "bg-red-500";
    const alreadyAnswered = selectedAnswer !== null;

    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">Question {qNum} / {room.totalQuestions}</span>
          <span className={`text-sm font-bold ${DIFFICULTY_COLORS[diff]}`}>{DIFFICULTY_LABELS[diff]}</span>
          <span className="text-3xl font-mono font-bold tabular-nums">{remainingSeconds}</span>
        </div>

        <div className="w-full h-2 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div className={`h-full rounded-full timer-bar ${timerColor}`} style={{ width: `${progressPct}%` }} />
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-center mb-8 leading-relaxed">{currentQuestion.text}</h2>

        {alreadyAnswered ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-5xl mb-3">✓</div>
            <p className="text-xl font-bold text-green-400">Reponse envoyee !</p>
            <p className="text-gray-400 text-sm mt-2">En attente des autres...</p>
            {/* Mini-indicateurs */}
            <div className="flex gap-2 mt-6">
              {players.map((p) => (
                <div key={p.id} className={`w-3 h-3 rounded-full ${answeredPlayerIds.includes(p.id) ? "bg-green-500" : "bg-white/20"}`} title={p.name} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 justify-center max-w-2xl mx-auto w-full">
            {currentQuestion.choices.map((choice, i) => (
              <button key={i} onClick={() => handleAnswer(i)} disabled={isExpired}
                className={`min-h-[60px] md:min-h-[70px] rounded-2xl bg-gradient-to-r ${ANSWER_COLORS_BTN[i]} flex items-center gap-4 px-5 text-left text-lg font-semibold transition-all active:scale-[0.98] disabled:opacity-40`}>
                <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl font-bold shrink-0">{ANSWER_LABELS[i]}</span>
                <span className="leading-tight">{choice}</span>
              </button>
            ))}
          </div>
        )}

        {submitError && <p className="text-red-400 text-center mt-2 text-sm">{submitError}</p>}

        {isHost && isExpired && !alreadyAnswered && (
          <button onClick={() => hostControl("next")} className="mt-4 mx-auto px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold transition">
            Voir la reponse
          </button>
        )}
      </div>
    );
  }

  // REVEAL remote : reponse + explication + scores
  if (room.status === "reveal" && currentQuestion && revealData) {
    const myResult = revealData.playerResults.find((r) => r.playerId === myId);
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8">
        <div className="text-sm text-gray-400 mb-4">Question {room.currentQuestionIndex + 1} / {room.totalQuestions}</div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
          {/* Resultat perso */}
          <div className="mb-6">
            {myResult?.correct ? (
              <p className="text-3xl font-bold text-green-400">🎉 Correct !</p>
            ) : (
              <p className="text-3xl font-bold text-red-400">😔 Incorrect</p>
            )}
          </div>

          <h2 className="text-lg font-bold text-center mb-6">{currentQuestion.text}</h2>

          {/* Choix avec highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mb-6">
            {currentQuestion.choices.map((choice, i) => {
              const isCorrect = i === revealData.correctIndex;
              return (
                <div key={i} className={`p-4 rounded-xl flex items-center gap-3 text-base border-2 ${isCorrect ? "bg-green-500/20 border-green-500 text-green-300" : "bg-white/5 border-white/10 text-gray-500"}`}>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg ${isCorrect ? "bg-green-500 text-white" : "bg-white/10"}`}>{ANSWER_LABELS[i]}</span>
                  <span>{choice}</span>
                  {isCorrect && <span className="ml-auto">✓</span>}
                </div>
              );
            })}
          </div>

          {/* Explication */}
          <div className="w-full p-4 rounded-xl bg-violet-500/10 border border-violet-500/30 mb-6">
            <p className="text-violet-300 font-bold mb-1 text-sm">Explication :</p>
            <p className="text-gray-300 leading-relaxed">{revealData.explanation}</p>
          </div>

          {/* Scores rapides */}
          <div className="flex flex-wrap gap-2 justify-center">
            {revealData.playerResults.map((pr) => (
              <div key={pr.playerId} className={`px-3 py-1.5 rounded-lg text-sm ${pr.correct ? "bg-green-500/20 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {pr.playerName} {pr.correct ? "✓" : "✗"}
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <button onClick={() => hostControl("next")}
            className="mt-4 mx-auto px-10 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-lg font-bold transition-all">
            Question suivante
          </button>
        )}
        {!isHost && (
          <p className="text-center text-gray-500 mt-4 text-sm">En attente de la prochaine question...</p>
        )}
      </div>
    );
  }

  // FIN remote
  if (room.status === "finished") {
    const myRank = scores.findIndex((s) => s.playerId === myId) + 1;
    const myScore = scores.find((s) => s.playerId === myId);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="absolute w-3 h-3 rounded-sm animate-confetti"
            style={{ left: `${Math.random() * 100}%`, backgroundColor: ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308"][i % 5], animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 3}s` }} />
        ))}

        <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Partie terminee !</h2>
        <p className="text-gray-400 mb-6">Votre place : <span className="text-white font-bold text-2xl">#{myRank}</span> — {myScore?.score || 0} pts</p>

        {/* Podium */}
        <div className="flex items-end gap-3 mb-8">
          {scores.length >= 2 && (
            <div className="text-center">
              <p className="text-sm mb-1">{players.find((p) => p.id === scores[1].playerId)?.name}</p>
              <div className="w-20 h-20 bg-gray-400/20 rounded-t-xl flex items-center justify-center text-3xl">🥈</div>
              <p className="text-xs font-mono text-gray-400">{scores[1].score}</p>
            </div>
          )}
          {scores.length >= 1 && (
            <div className="text-center">
              <p className="text-base font-bold mb-1">{players.find((p) => p.id === scores[0].playerId)?.name}</p>
              <div className="w-24 h-28 bg-yellow-500/20 rounded-t-xl flex items-center justify-center text-4xl">🥇</div>
              <p className="text-sm font-mono font-bold text-yellow-400">{scores[0].score}</p>
            </div>
          )}
          {scores.length >= 3 && (
            <div className="text-center">
              <p className="text-sm mb-1">{players.find((p) => p.id === scores[2].playerId)?.name}</p>
              <div className="w-20 h-14 bg-orange-700/20 rounded-t-xl flex items-center justify-center text-3xl">🥉</div>
              <p className="text-xs font-mono text-orange-400">{scores[2].score}</p>
            </div>
          )}
        </div>

        {scores.length > 3 && (
          <div className="w-full max-w-sm space-y-1">
            {scores.slice(3).map((s, i) => {
              const p = players.find((pl) => pl.id === s.playerId);
              return (
                <div key={s.playerId} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${s.playerId === myId ? "bg-violet-500/20" : "bg-white/5"}`}>
                  <span className="w-5 text-center text-gray-500">{i + 4}</span>
                  <span className="flex-1">{p?.name}</span>
                  <span className="font-mono text-gray-400">{s.score}</span>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => window.location.href = "/"} className="mt-6 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition">
          Nouvelle partie
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

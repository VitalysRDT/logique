"use client";

import { use, useState, useEffect, useRef, useMemo } from "react";
import { useGameState } from "@/hooks/useGameState";
import { useGameActions } from "@/hooks/useGameActions";
import { useTimer } from "@/hooks/useTimer";
import { useAudio } from "@/hooks/useAudio";
import { QRCodeSVG } from "qrcode.react";
import { rulesIntroSegments, questionIntro, revealComment, gameOverComment, timerWarning, leaderboardUpdate } from "@/lib/commentary";
import { estimateIQ, iqLabel } from "@/lib/scoring";

const ANSWER_COLORS = ["from-blue-600 to-blue-500", "from-orange-600 to-orange-500", "from-green-600 to-green-500", "from-purple-600 to-purple-500"];
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
  const { speak, speakAsync, speakNow, prefetch, stop } = useAudio();
  const lastSpokenRef = useRef("");
  const timerWarnedRef = useRef(-1);

  const [newPlayerName, setNewPlayerName] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addError, setAddError] = useState("");
  const [playerCredentials, setPlayerCredentials] = useState<Record<string, { playerId: string; token: string }>>({});
  const [introStep, setIntroStep] = useState(-1);

  const isHost = typeof window !== "undefined" && sessionStorage.getItem(`isHost_${roomCode}`) === "true";
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  useMemo(() => {
    if (typeof window === "undefined") return;
    const hostId = sessionStorage.getItem(`player_${roomCode}`);
    const hostToken = sessionStorage.getItem(`token_${roomCode}`);
    if (hostId && hostToken) setPlayerCredentials((prev) => ({ ...prev, [hostId]: { playerId: hostId, token: hostToken } }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // === INTRO ASYNC : audio synchronise avec les animations ===
  useEffect(() => {
    if (!state || state.room.status !== "intro") return;
    const cancelled = { current: false };

    const segments = rulesIntroSegments(state.players.map((p) => p.name), state.players.length === 1);

    // Prefetch tous les segments en parallele
    segments.forEach((s) => prefetch(s.text));
    // Prefetch Q1
    if (state.nextQuestion) {
      prefetch(questionIntro(1, state.room.totalQuestions, state.nextQuestion.difficulty, state.nextQuestion.text));
    }

    async function runIntro() {
      for (let i = 0; i < segments.length; i++) {
        if (cancelled.current) return;
        setIntroStep(i);
        await speakAsync(segments[i].text);
      }
      if (cancelled.current) return;
      setIntroStep(segments.length);
      // Petite pause avant de commencer
      await new Promise((r) => setTimeout(r, 500));
      if (cancelled.current) return;
      if (isHost) hostControl("begin");
    }

    runIntro();
    return () => { cancelled.current = true; stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.room?.status]);

  // === AUDIO : question, reveal, fin ===
  useEffect(() => {
    if (!state) return;
    const { room, players, currentQuestion, revealData, scores, nextQuestion } = state;
    const key = `${room.status}-${room.currentQuestionIndex}`;
    if (key === lastSpokenRef.current) return;
    if (room.status === "intro" || room.status === "waiting") return;
    lastSpokenRef.current = key;

    if (room.status === "playing" && currentQuestion) {
      const qNum = room.currentQuestionIndex + 1;
      speakNow(questionIntro(qNum, room.totalQuestions, currentQuestion.difficulty, currentQuestion.text));
      if (nextQuestion) prefetch(questionIntro(qNum + 1, room.totalQuestions, nextQuestion.difficulty, nextQuestion.text));
    } else if (room.status === "reveal" && revealData && currentQuestion) {
      const correctAnswer = currentQuestion.choices[revealData.correctIndex];
      const qNum = room.currentQuestionIndex + 1;
      let text = revealComment(correctAnswer, revealData.explanation, revealData.playerResults, players.map((p) => ({ name: p.name, streak: p.streak })));
      if (qNum % 5 === 0 && players.length > 1) {
        text += " " + leaderboardUpdate(scores.map((s) => ({ playerName: players.find((p) => p.id === s.playerId)?.name || "?", score: s.score })), qNum);
      }
      speakNow(text);
      if (nextQuestion) prefetch(questionIntro(qNum + 1, room.totalQuestions, nextQuestion.difficulty, nextQuestion.text));
    } else if (room.status === "finished" && scores.length > 0) {
      speakNow(gameOverComment(scores.map((s) => ({ playerName: players.find((p) => p.id === s.playerId)?.name || "?", score: s.score }))));
    }
  }, [state, speakNow, prefetch, speak]);

  // === TIMER WARNING 5 secondes ===
  useEffect(() => {
    if (!state || state.room.status !== "playing") return;
    if (remainingSeconds === 5 && timerWarnedRef.current !== state.room.currentQuestionIndex) {
      timerWarnedRef.current = state.room.currentQuestionIndex;
      speak(timerWarning());
    }
  }, [remainingSeconds, state?.room?.status, state?.room?.currentQuestionIndex, speak]);

  // Prefetch rules en lobby
  useEffect(() => {
    if (!state || state.room.status !== "waiting" || state.players.length < 1) return;
    const segs = rulesIntroSegments(state.players.map((p) => p.name), state.players.length === 1);
    segs.forEach((s) => prefetch(s.text));
  }, [state?.players?.length, state?.room?.status, prefetch, state]);

  useEffect(() => () => stop(), [stop]);

  async function handleAddPlayer() {
    if (!newPlayerName.trim()) return;
    setAddingPlayer(true);
    setAddError("");
    try {
      const avatar = PLAYER_AVATARS[(state?.players?.length || 0) % PLAYER_AVATARS.length];
      const res = await fetch("/api/game/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomCode, playerName: newPlayerName.trim(), avatar }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlayerCredentials((prev) => ({ ...prev, [data.playerId]: { playerId: data.playerId, token: data.token } }));
      setNewPlayerName("");
    } catch (err) { setAddError(err instanceof Error ? err.message : "Erreur"); }
    finally { setAddingPlayer(false); }
  }

  if (loading && !state) return <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-gray-400 animate-pulse">Chargement...</div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-red-400">{error}</div></div>;
  if (!state) return null;

  const { room, players, scores, currentQuestion, revealData, answeredPlayerIds } = state;
  const allPlayersHaveQR = players.every((p) => playerCredentials[p.id]);

  // === LOBBY ===
  if (room.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-8">LOGIQUE</h1>
        <div className="w-full max-w-2xl mb-8">
          <div className="flex gap-3">
            <input type="text" placeholder="Nom du joueur..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()} maxLength={20} className="flex-1 px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-lg placeholder:text-gray-500 focus:outline-none focus:border-violet-500" autoFocus />
            <button onClick={handleAddPlayer} disabled={addingPlayer} className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-lg font-bold disabled:opacity-50 transition-all whitespace-nowrap">+ Ajouter</button>
          </div>
          {addError && <p className="text-red-400 mt-2 text-sm">{addError}</p>}
        </div>
        {players.length > 0 && (
          <div className="w-full max-w-4xl">
            <p className="text-gray-400 text-center mb-4">Chaque joueur scanne SON QR code avec son telephone</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {players.map((p) => { const c = playerCredentials[p.id]; const url = c ? `${appUrl}/play/${roomCode}?p=${c.playerId}&t=${c.token}` : "";
                return (<div key={p.id} className="flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10 animate-slide-up"><p className="text-lg font-bold mb-3">{p.avatar} {p.name}</p>{url ? <div className="bg-white p-3 rounded-xl"><QRCodeSVG value={url} size={140} level="M" /></div> : <div className="w-[164px] h-[164px] bg-white/10 rounded-xl" />}</div>);
              })}
            </div>
          </div>
        )}
        <p className="text-gray-500 mt-6">{players.length} joueur{players.length > 1 ? "s" : ""}</p>
        {isHost && players.length >= 1 && allPlayersHaveQR && (
          <button onClick={() => hostControl("start")} className="mt-6 px-12 py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-2xl font-bold hover:from-violet-500 hover:to-indigo-500 transition-all animate-pulse-glow">Lancer la partie !</button>
        )}
      </div>
    );
  }

  // === INTRO ANIMEE (synchronisee avec Benoit) ===
  if (room.status === "intro") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950 via-indigo-950 to-black" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl w-full">

          {/* Step 0 : Titre */}
          <h1 className={`text-7xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent transition-all duration-1000 ${introStep >= 0 ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>LOGIQUE</h1>
          <p className={`text-xl text-gray-400 mt-2 transition-all duration-700 ${introStep >= 0 ? "opacity-100" : "opacity-0"}`}>Le jeu de logique ultime</p>

          {/* Step 1 : Joueurs */}
          <div className={`flex flex-wrap gap-4 justify-center mt-8 transition-all duration-700 ${introStep >= 1 ? "opacity-100" : "opacity-0"}`}>
            {players.map((p, i) => (
              <div key={p.id} className="px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-xl font-bold animate-slide-up" style={{ animationDelay: `${i * 300}ms` }}>{p.avatar} {p.name}</div>
            ))}
          </div>

          {/* Step 2 : Telephone + boutons */}
          <div className={`mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 transition-all duration-700 ${introStep >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <p className="text-gray-400 mb-4 text-lg">Votre telephone = votre manette</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              {["A", "B", "C", "D"].map((label, i) => (
                <div key={label} className={`h-16 rounded-xl bg-gradient-to-r ${ANSWER_COLORS[i]} flex items-center justify-center text-2xl font-bold animate-slide-up`} style={{ animationDelay: `${i * 200}ms` }}>{label}</div>
              ))}
            </div>
          </div>

          {/* Step 3 : Scoring */}
          <div className={`mt-8 w-full transition-all duration-700 ${introStep >= 3 ? "opacity-100" : "opacity-0"}`}>
            <p className="text-gray-400 mb-3 text-lg">Points par niveau de difficulte</p>
            <div className="flex items-end gap-1 justify-center h-32">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="flex flex-col items-center animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <span className="text-xs text-gray-500 mb-1">{(i + 1) * 100}</span>
                  <div className={`w-8 rounded-t-md ${i < 3 ? "bg-green-500" : i < 5 ? "bg-yellow-500" : i < 7 ? "bg-orange-500" : "bg-red-500"}`} style={{ height: `${(i + 1) * 10 + 10}px` }} />
                  <span className="text-xs text-gray-400 mt-1">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4 : Vitesse */}
          <div className={`mt-8 flex items-center gap-6 transition-all duration-700 ${introStep >= 4 ? "opacity-100" : "opacity-0"}`}>
            <div className="text-5xl">⚡</div>
            <div className="text-left">
              <p className="text-xl font-bold text-yellow-400">Bonus de vitesse !</p>
              <p className="text-gray-400">Instantane = 100% des points</p>
              <p className="text-gray-400">Derniere seconde = 25% seulement</p>
            </div>
          </div>

          {/* Step 5 : Difficulte */}
          <div className={`mt-8 w-full max-w-lg transition-all duration-700 ${introStep >= 5 ? "opacity-100" : "opacity-0"}`}>
            <p className="text-gray-400 mb-2">Progression de la difficulte</p>
            <div className="h-4 rounded-full overflow-hidden bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-600 w-full" />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Trivial</span><span>Facile</span><span>Moyen</span><span>Difficile</span><span>Impossible</span>
            </div>
          </div>

          {/* Step 6 : Bouton "Je suis pret" */}
          <div className={`mt-8 transition-all duration-700 ${introStep >= 6 ? "opacity-100" : "opacity-0"}`}>
            <p className="text-gray-400 mb-3">Apres chaque question :</p>
            <div className="px-10 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-xl font-bold animate-pulse-glow inline-block">Je suis pret !</div>
          </div>

          {/* Step 7 : Countdown */}
          {introStep >= 7 && (
            <div className="mt-10">
              <p className="text-7xl font-mono font-bold text-yellow-400 animate-pulse">3... 2... 1...</p>
            </div>
          )}

          {/* Step 8 : C'est parti */}
          {introStep >= 8 && (
            <p className="mt-4 text-6xl font-bold text-green-400">C&apos;EST PARTI !</p>
          )}
        </div>
      </div>
    );
  }

  // === QUESTION ===
  if (room.status === "playing" && currentQuestion) {
    const qNum = room.currentQuestionIndex + 1;
    const diff = currentQuestion.difficulty;
    const tl = currentQuestion.time_limit;
    const pct = tl > 0 ? Math.max(0, (remainingSeconds / tl) * 100) : 0;
    const tc = remainingSeconds > tl * 0.5 ? "bg-green-500" : remainingSeconds > tl * 0.2 ? "bg-yellow-500" : "bg-red-500";

    return (
      <div className="min-h-screen flex flex-col p-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg text-gray-400">Question {qNum} / {room.totalQuestions}</span>
          <span className={`text-lg font-bold ${DIFFICULTY_COLORS[diff]}`}>{DIFFICULTY_LABELS[diff]} (Niv. {diff})</span>
          <span className={`text-4xl font-mono font-bold tabular-nums ${remainingSeconds <= 5 ? "text-red-500 animate-pulse" : ""}`}>{remainingSeconds}</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full mb-8 overflow-hidden"><div className={`h-full rounded-full timer-bar ${tc}`} style={{ width: `${pct}%` }} /></div>
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <h2 className="text-3xl font-bold text-center mb-12 leading-relaxed">{currentQuestion.text}</h2>
          <div className="grid grid-cols-2 gap-4 w-full">
            {currentQuestion.choices.map((c, i) => (
              <div key={i} className={`p-6 rounded-xl bg-gradient-to-r ${ANSWER_COLORS[i]} flex items-center gap-4 text-xl`}>
                <span className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-2xl">{ANSWER_LABELS[i]}</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 justify-center mt-8">
          {players.map((p) => {
            const a = answeredPlayerIds?.includes(p.id);
            return <div key={p.id} className={`px-4 py-2 rounded-lg text-sm transition-all ${a ? "bg-green-500/20 border border-green-500/50 text-green-400" : "bg-white/5 border border-white/10 text-gray-500"}`}>{p.avatar} {p.name} {a && "✓"}</div>;
          })}
        </div>
      </div>
    );
  }

  // === REVEAL + SCOREBOARD ===
  if (room.status === "reveal" && currentQuestion && revealData) {
    const maxScore = Math.max(...scores.map((s) => s.score), 1);
    return (
      <div className="min-h-screen flex flex-col p-8">
        <div className="text-lg text-gray-400 mb-4">Question {room.currentQuestionIndex + 1} / {room.totalQuestions}</div>
        <div className="flex-1 flex gap-8 max-w-6xl mx-auto w-full">
          <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold text-center mb-6">{currentQuestion.text}</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {currentQuestion.choices.map((c, i) => {
                const ok = i === revealData.correctIndex;
                return <div key={i} className={`p-4 rounded-xl flex items-center gap-3 text-lg border-2 ${ok ? "bg-green-500/20 border-green-500 text-green-300" : "bg-white/5 border-white/10 text-gray-500"}`}><span className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${ok ? "bg-green-500 text-white" : "bg-white/10"}`}>{ANSWER_LABELS[i]}</span><span>{c}</span>{ok && <span className="ml-auto">✓</span>}</div>;
              })}
            </div>
            <div className="p-5 rounded-xl bg-violet-500/10 border border-violet-500/30">
              <p className="text-violet-300 font-bold mb-1">Explication :</p>
              <p className="text-gray-300 leading-relaxed">{revealData.explanation}</p>
            </div>
          </div>
          {/* Scoreboard */}
          <div className="w-80 flex flex-col">
            <h3 className="text-xl font-bold mb-4 text-center">Classement</h3>
            <div className="space-y-2">
              {scores.map((s, i) => {
                const pl = players.find((p) => p.id === s.playerId);
                const r = revealData.playerResults.find((pr) => pr.playerId === s.playerId);
                const rc = r ? r.previousRank - r.newRank : 0;
                const bw = maxScore > 0 ? (s.score / maxScore) * 100 : 0;
                return (
                  <div key={s.playerId} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl w-8 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
                      <span className="flex-1 font-bold">{pl?.avatar} {pl?.name}</span>
                      {r && r.pointsEarned > 0 && <span className="text-green-400 font-bold text-sm">+{r.pointsEarned}</span>}
                      {rc > 0 && <span className="text-green-400 text-sm font-bold">↑{rc}</span>}
                      {rc < 0 && <span className="text-red-400 text-sm font-bold">↓{Math.abs(rc)}</span>}
                    </div>
                    <div className="h-6 bg-white/5 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? "bg-gradient-to-r from-yellow-500 to-amber-400" : i === 1 ? "bg-gradient-to-r from-gray-400 to-gray-300" : i === 2 ? "bg-gradient-to-r from-orange-600 to-orange-400" : "bg-gradient-to-r from-violet-600 to-violet-400"}`} style={{ width: `${bw}%` }} /></div>
                    <p className="text-right text-sm font-mono text-gray-400 mt-0.5">{s.score} pts</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-lg">{(state?.readyPlayerIds?.length || 0)} / {players.length} joueurs prets</p>
          <div className="flex gap-2 justify-center mt-2">
            {players.map((p) => <div key={p.id} className={`px-3 py-1 rounded-lg text-sm ${state?.readyPlayerIds?.includes(p.id) ? "bg-green-500/20 text-green-400" : "bg-white/5 text-gray-600"}`}>{p.avatar} {p.name} {state?.readyPlayerIds?.includes(p.id) && "✓"}</div>)}
          </div>
        </div>
      </div>
    );
  }

  // === FIN + QI ===
  if (room.status === "finished") {
    const winnerScore = scores[0]?.score || 0;
    const iq = estimateIQ(winnerScore);
    const iqPct = Math.min(100, ((iq - 70) / (170 - 70)) * 100);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => <div key={i} className="absolute w-3 h-3 rounded-sm animate-confetti" style={{ left: `${Math.random() * 100}%`, backgroundColor: ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308"][i % 5], animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 3}s` }} />)}

        <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Partie terminee !</h2>

        {/* Podium */}
        <div className="flex items-end gap-4 mb-8 mt-8">
          {scores.length >= 2 && <div className="text-center"><p className="text-xl mb-2">{players.find((p) => p.id === scores[1].playerId)?.name}</p><div className="w-28 h-28 bg-gray-400/20 rounded-t-xl flex items-center justify-center text-4xl">🥈</div><p className="text-lg font-mono text-gray-400">{scores[1].score}</p></div>}
          {scores.length >= 1 && <div className="text-center"><p className="text-2xl font-bold mb-2">{players.find((p) => p.id === scores[0].playerId)?.name}</p><div className="w-32 h-40 bg-yellow-500/20 rounded-t-xl flex items-center justify-center text-5xl">🥇</div><p className="text-xl font-mono font-bold text-yellow-400">{scores[0].score}</p></div>}
          {scores.length >= 3 && <div className="text-center"><p className="text-xl mb-2">{players.find((p) => p.id === scores[2].playerId)?.name}</p><div className="w-28 h-20 bg-orange-700/20 rounded-t-xl flex items-center justify-center text-4xl">🥉</div><p className="text-lg font-mono text-orange-400">{scores[2].score}</p></div>}
        </div>

        {/* QI Gauge */}
        <div className="w-full max-w-md text-center mb-8">
          <p className="text-gray-400 mb-2">QI logique estime</p>
          <p className="text-6xl font-bold text-cyan-400 mb-1">{iq}</p>
          <p className="text-xl text-gray-300 mb-4">{iqLabel(iq)}</p>
          <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-cyan-500 transition-all duration-2000" style={{ width: `${iqPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>80</span><span>100</span><span>120</span><span>140</span><span>160+</span>
          </div>
        </div>

        <button onClick={() => window.location.href = "/"} className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition">Nouvelle partie</button>
      </div>
    );
  }

  return null;
}

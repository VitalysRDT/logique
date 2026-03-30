"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "home" | "party-create" | "remote-create" | "remote-join";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("home");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(gameMode: "party" | "remote") {
    if (!name.trim()) return setError("Entrez votre nom");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name.trim(), mode: gameMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      sessionStorage.setItem(`player_${data.roomCode}`, data.playerId);
      sessionStorage.setItem(`token_${data.roomCode}`, data.token);
      sessionStorage.setItem(`name_${data.roomCode}`, name.trim());
      sessionStorage.setItem(`isHost_${data.roomCode}`, "true");

      if (gameMode === "party") {
        router.push(`/screen/${data.roomCode}`);
      } else {
        router.push(`/play/${data.roomCode}?p=${data.playerId}&t=${data.token}`);
      }
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
    setMode("home");
    setError("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            LOGIQUE
          </h1>
          <p className="mt-3 text-lg text-gray-400">
            100 questions de logique. Du trivial a l&apos;impossible.
          </p>
        </div>

        {/* === CHOIX DU MODE === */}
        {mode === "home" && (
          <div className="space-y-4 animate-slide-up">
            {/* MODE SOIREE */}
            <button
              onClick={() => setMode("party-create")}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-left px-6 hover:from-violet-500 hover:to-indigo-500 transition-all animate-pulse-glow"
            >
              <span className="text-xl font-bold block">🎉 Mode Soiree</span>
              <span className="text-sm text-violet-200 block mt-1">
                1 grand ecran + telephones comme manettes
              </span>
            </button>

            {/* MODE A DISTANCE */}
            <button
              onClick={() => setMode("remote-create")}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-left px-6 hover:from-cyan-500 hover:to-blue-500 transition-all"
            >
              <span className="text-xl font-bold block">🌐 Mode A distance</span>
              <span className="text-sm text-cyan-200 block mt-1">
                Chaque joueur sur son propre ecran
              </span>
            </button>

            {/* REJOINDRE */}
            <button
              onClick={() => setMode("remote-join")}
              className="w-full py-4 rounded-2xl bg-white/10 text-lg font-bold hover:bg-white/20 transition-all border border-white/20"
            >
              Rejoindre une partie
            </button>
          </div>
        )}

        {/* === CREER SOIREE === */}
        {mode === "party-create" && (
          <div className="space-y-4 animate-slide-up">
            <div className="text-center text-sm text-gray-400 bg-white/5 rounded-xl p-3 border border-white/10">
              🎉 <strong>Mode Soiree</strong> — Ouvrez cette page sur un grand ecran (TV, PC). Les joueurs utiliseront leur telephone comme manette.
            </div>
            <input
              type="text"
              placeholder="Nom de l'organisateur"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate("party")}
              maxLength={20}
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-lg placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
              autoFocus
            />
            <button
              onClick={() => handleCreate("party")}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-lg font-bold disabled:opacity-50 transition-all"
            >
              {loading ? "Creation..." : "Creer la partie"}
            </button>
            <button onClick={back} className="w-full py-3 text-gray-400 hover:text-white transition">Retour</button>
          </div>
        )}

        {/* === CREER A DISTANCE === */}
        {mode === "remote-create" && (
          <div className="space-y-4 animate-slide-up">
            <div className="text-center text-sm text-gray-400 bg-white/5 rounded-xl p-3 border border-white/10">
              🌐 <strong>Mode A distance</strong> — Chaque joueur voit les questions et repond sur son propre ecran. Partagez le code avec vos amis.
            </div>
            <input
              type="text"
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate("remote")}
              maxLength={20}
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-lg placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
              autoFocus
            />
            <button
              onClick={() => handleCreate("remote")}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-lg font-bold disabled:opacity-50 transition-all"
            >
              {loading ? "Creation..." : "Creer la partie"}
            </button>
            <button onClick={back} className="w-full py-3 text-gray-400 hover:text-white transition">Retour</button>
          </div>
        )}

        {/* === REJOINDRE === */}
        {mode === "remote-join" && (
          <div className="space-y-4 animate-slide-up">
            <input
              type="text"
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-lg placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Code de la partie (ex: BXKF)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              maxLength={4}
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-lg text-center tracking-[0.5em] font-mono uppercase placeholder:text-gray-500 placeholder:tracking-normal focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-lg font-bold disabled:opacity-50 transition-all"
            >
              {loading ? "Connexion..." : "Rejoindre"}
            </button>
            <button onClick={back} className="w-full py-3 text-gray-400 hover:text-white transition">Retour</button>
          </div>
        )}

        {error && (
          <p className="text-center text-red-400 animate-slide-up">{error}</p>
        )}
      </div>
    </div>
  );
}

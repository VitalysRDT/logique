"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return setError("Entrez votre nom");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      sessionStorage.setItem(`player_${data.roomCode}`, data.playerId);
      sessionStorage.setItem(`token_${data.roomCode}`, data.token);
      sessionStorage.setItem(`name_${data.roomCode}`, name.trim());
      sessionStorage.setItem(`isHost_${data.roomCode}`, "true");

      router.push(`/screen/${data.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) return setError("Entrez votre nom");
    if (!roomCode.trim()) return setError("Entrez le code room");
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

      router.push(`/play/${data.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Titre */}
        <div className="text-center">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            LOGIQUE
          </h1>
          <p className="mt-3 text-lg text-gray-400">
            100 questions de logique. Du trivial a l&apos;impossible.
          </p>
        </div>

        {mode === "home" && (
          <div className="space-y-4 animate-slide-up">
            <button
              onClick={() => setMode("create")}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-xl font-bold hover:from-violet-500 hover:to-indigo-500 transition-all animate-pulse-glow"
            >
              Creer une partie
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full py-5 rounded-2xl bg-white/10 text-xl font-bold hover:bg-white/20 transition-all border border-white/20"
            >
              Rejoindre une partie
            </button>
          </div>
        )}

        {mode === "create" && (
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
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-lg font-bold disabled:opacity-50 hover:from-violet-500 hover:to-indigo-500 transition-all"
            >
              {loading ? "Creation..." : "Lancer la partie"}
            </button>
            <button
              onClick={() => { setMode("home"); setError(""); }}
              className="w-full py-3 text-gray-400 hover:text-white transition"
            >
              Retour
            </button>
          </div>
        )}

        {mode === "join" && (
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
              placeholder="Code room (ex: BXKF)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-lg text-center tracking-[0.5em] font-mono uppercase placeholder:text-gray-500 placeholder:tracking-normal focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-lg font-bold disabled:opacity-50 hover:from-cyan-500 hover:to-blue-500 transition-all"
            >
              {loading ? "Connexion..." : "Rejoindre"}
            </button>
            <button
              onClick={() => { setMode("home"); setError(""); }}
              className="w-full py-3 text-gray-400 hover:text-white transition"
            >
              Retour
            </button>
          </div>
        )}

        {error && (
          <p className="text-center text-red-400 animate-slide-up">{error}</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
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
          <p className="mt-1 text-sm text-gray-500">
            Ouvrez cette page sur un grand ecran (TV, PC, projecteur)
          </p>
        </div>

        <div className="space-y-4 animate-slide-up">
          <input
            type="text"
            placeholder="Nom de l'organisateur"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            maxLength={20}
            className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-lg placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-xl font-bold disabled:opacity-50 hover:from-violet-500 hover:to-indigo-500 transition-all animate-pulse-glow"
          >
            {loading ? "Creation..." : "Creer une partie"}
          </button>
        </div>

        {error && (
          <p className="text-center text-red-400 animate-slide-up">{error}</p>
        )}
      </div>
    </div>
  );
}

import type { QuizType } from "./types";

export interface LyricLine {
  time: number;
  text: string;
  type?: "chorus" | "bridge" | "shout" | "instrumental";
}

// Thème visuel d'un karaoké — classes Tailwind complètes (litterales pour le JIT)
export interface KaraokeTheme {
  titleGradient: string;     // dégradé du titre (splash + header)
  bgGradient: string;        // fond animé principal
  splashBgGradient: string;  // fond du splash "Appuyez pour commencer"
  orb1: string;              // couleur orbe 1
  orb2: string;              // couleur orbe 2
  progress: string;          // dégradé barre de progression
  chorusGradient: string;    // dégradé du texte au refrain
  chorusOverlay: string;     // voile coloré sur le refrain
  shoutOverlay: string;      // voile coloré sur les "shout"
  shoutColor: string;        // couleur du texte "shout"
  bridgeColor: string;       // couleur du texte "bridge"
  eq: string;                // dégradé de l'égaliseur
}

export interface KaraokeSong {
  audioSrc: string;
  totalDuration: number;
  title: string;       // gros titre du splash
  splashSubtitle: string;
  tagline: string;     // petit label en haut de l'écran karaoké
  ticker?: string;     // bandeau défilant optionnel (style breaking news)
  theme: KaraokeTheme;
  lyrics: LyricLine[];
}

const LOGIQUE_LYRICS: LyricLine[] = [
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

// Timecodes extraits par Parakeet v3 (word-level timestamps)
const ACTU_LYRICS: LyricLine[] = [
  { time: 0.0, text: "♫  ♫  ♫", type: "instrumental" },

  { time: 2.5, text: "Breaking news... Breaking news...", type: "shout" },
  { time: 12.3, text: "Deux mille vingt-cinq... écoute bien" },

  { time: 16.4, text: "Premier flash, le monde tourne plus vite" },
  { time: 20.4, text: "Chaque seconde, une histoire qui s'écrit" },
  { time: 24.4, text: "Chaque seconde, une histoire qui s'écrit" },
  { time: 28.1, text: "Sur tous les écrans, la planète s'agite" },
  { time: 32.1, text: "Sur tous les écrans, la planète s'agite" },
  { time: 36.2, text: "On te raconte tout, du jour à la nuit" },

  { time: 40.1, text: "Ça bouge, ça vibre, t'es au cœur de l'action", type: "bridge" },
  { time: 44.4, text: "Branche-toi, ouvre grand, c'est l'information", type: "bridge" },

  { time: 48.6, text: "ACTU 2025 !", type: "chorus" },
  { time: 51.5, text: "Ouais ! Le monde en direct sous tes yeux", type: "chorus" },
  { time: 56.6, text: "ACTU 2025 !", type: "chorus" },
  { time: 59.6, text: "Allez ! Reste connecté, c'est sérieux", type: "chorus" },
  { time: 64.6, text: "De la une jusqu'au dernier titre", type: "chorus" },
  { time: 68.0, text: "On t'emmène plus loin, plus vite", type: "chorus" },

  { time: 72.5, text: "Politique, sport, science et culture" },
  { time: 80.1, text: "Une vérité qui jamais ne s'use" },
  { time: 84.1, text: "Les faits d'abord, pas de couverture" },
  { time: 88.1, text: "Les faits d'abord, pas de couverture" },
  { time: 92.3, text: "On vérifie tout avant qu'on diffuse" },

  { time: 96.0, text: "Ça bouge, ça vibre, t'es au cœur de l'action", type: "bridge" },
  { time: 100.4, text: "Branche-toi, ouvre grand, c'est l'information", type: "bridge" },

  { time: 104.6, text: "ACTU 2025 !", type: "chorus" },
  { time: 107.5, text: "Ouais ! Le monde en direct sous tes yeux", type: "chorus" },
  { time: 112.6, text: "ACTU 2025 !", type: "chorus" },
  { time: 115.6, text: "Allez ! Reste connecté, c'est sérieux", type: "chorus" },
  { time: 120.6, text: "De la une jusqu'au dernier titre", type: "chorus" },
  { time: 124.8, text: "On t'emmène plus loin, plus vite", type: "chorus" },

  { time: 128.5, text: "Breaking news, breaking news", type: "shout" },
  { time: 136.1, text: "Du nord au sud, d'est en ouest", type: "bridge" },
  { time: 140.2, text: "Une seule chaîne qui ne s'arrête jamais", type: "bridge" },
  { time: 144.5, text: "Breaking news, breaking news", type: "shout" },
  { time: 148.0, text: "L'info en boucle, l'info qui ne ment pas", type: "bridge" },

  { time: 152.7, text: "ACTU 2025 !", type: "shout" },
  { time: 155.6, text: "Le monde en direct, reste avec nous", type: "chorus" },
  { time: 160.7, text: "ACTU 2025 !", type: "shout" },
  { time: 163.6, text: "Reste connecté... reste avec nous", type: "chorus" },

  { time: 167.0, text: "♫  ♫  ♫", type: "instrumental" },
];

export const KARAOKE_SONGS: Partial<Record<QuizType, KaraokeSong>> = {
  logique: {
    audioSrc: "/audio/theme.mp3",
    totalDuration: 120,
    title: "LOGIQUE",
    splashSubtitle: "Le jeu de logique ultime",
    tagline: "Logique — Le Générique",
    theme: {
      titleGradient: "from-violet-400 via-cyan-300 to-violet-400",
      bgGradient: "from-violet-950/80 via-black to-cyan-950/40",
      splashBgGradient: "from-violet-950/50 via-transparent to-cyan-950/30",
      orb1: "bg-violet-600/15",
      orb2: "bg-cyan-600/10",
      progress: "from-violet-500 via-pink-500 to-cyan-500",
      chorusGradient: "from-violet-400 via-pink-400 to-cyan-400",
      chorusOverlay: "bg-violet-500/5",
      shoutOverlay: "bg-yellow-500/5",
      shoutColor: "text-yellow-400",
      bridgeColor: "text-violet-300",
      eq: "from-violet-500 to-cyan-400",
    },
    lyrics: LOGIQUE_LYRICS,
  },
  actualite: {
    audioSrc: "/audio/actu-2025.mp3",
    totalDuration: 179,
    title: "ACTU 2025",
    splashSubtitle: "L'hymne de l'actu",
    tagline: "Actu 2025 — L'Hymne",
    ticker: "● DIRECT  —  ACTU 2025  —  LE MONDE EN DIRECT SOUS TES YEUX  —  RESTE CONNECTÉ  —  BREAKING NEWS  —  ",
    theme: {
      titleGradient: "from-amber-400 via-rose-400 to-red-500",
      bgGradient: "from-red-950/70 via-black to-amber-950/40",
      splashBgGradient: "from-red-950/50 via-transparent to-amber-950/30",
      orb1: "bg-red-600/15",
      orb2: "bg-amber-500/10",
      progress: "from-amber-500 via-orange-500 to-red-500",
      chorusGradient: "from-amber-300 via-orange-400 to-red-400",
      chorusOverlay: "bg-red-600/5",
      shoutOverlay: "bg-amber-500/8",
      shoutColor: "text-amber-300",
      bridgeColor: "text-rose-300",
      eq: "from-amber-500 to-red-400",
    },
    lyrics: ACTU_LYRICS,
  },
};

export function getKaraokeSong(type: QuizType): KaraokeSong | null {
  return KARAOKE_SONGS[type] ?? null;
}

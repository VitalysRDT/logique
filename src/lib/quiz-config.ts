import type { QuizType } from "./types";

export interface QuizConfig {
  id: QuizType;
  name: string;
  subtitle: string;
  emoji: string;
  questionCount: number;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  accentColor: string;
  badgeText: string;
  metricName: string;
  hostGameName: string;
  hasKaraoke: boolean;
}

const CONFIGS: Record<QuizType, QuizConfig> = {
  logique: {
    id: "logique",
    name: "LOGIQUE",
    subtitle: "Du trivial \u00e0 l\u2019impossible",
    emoji: "\ud83e\udde0",
    questionCount: 100,
    gradientFrom: "from-violet-400",
    gradientVia: "via-cyan-300",
    gradientTo: "to-violet-400",
    accentColor: "violet",
    badgeText: "100 questions de logique",
    metricName: "QI logique",
    hostGameName: "Logique",
    hasKaraoke: true,
  },
  actualite: {
    id: "actualite",
    name: "ACTU 2025",
    subtitle: "Testez vos connaissances de l\u2019ann\u00e9e",
    emoji: "\ud83d\udcf0",
    questionCount: 100,
    gradientFrom: "from-amber-400",
    gradientVia: "via-rose-300",
    gradientTo: "to-amber-400",
    accentColor: "amber",
    badgeText: "100 questions sur l\u2019actu 2025",
    metricName: "Niveau d\u2019expertise",
    hostGameName: "Actualit\u00e9 2025",
    hasKaraoke: false,
  },
};

export function getQuizConfig(type: QuizType): QuizConfig {
  return CONFIGS[type] || CONFIGS.logique;
}

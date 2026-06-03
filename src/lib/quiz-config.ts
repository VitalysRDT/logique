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
  narrationSubject: string;
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
    narrationSubject: "la logique pure",
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
    hasKaraoke: true,
    narrationSubject: "l\u2019actualit\u00e9 2025",
  },
  sciences: {
    id: "sciences",
    name: "SCIENCES",
    subtitle: "La nature et l\u2019univers d\u00e9crypt\u00e9s",
    emoji: "\ud83d\udd2c",
    questionCount: 100,
    gradientFrom: "from-emerald-400",
    gradientVia: "via-teal-300",
    gradientTo: "to-emerald-400",
    accentColor: "emerald",
    badgeText: "100 questions de sciences & nature",
    metricName: "Niveau scientifique",
    hostGameName: "Sciences & Nature",
    hasKaraoke: false,
    narrationSubject: "les sciences et la nature",
  },
  vraifaux: {
    id: "vraifaux",
    name: "VRAI ou FAUX",
    subtitle: "D\u00e9m\u00ealez le vrai des id\u00e9es re\u00e7ues",
    emoji: "\ud83e\udd14",
    questionCount: 100,
    gradientFrom: "from-sky-400",
    gradientVia: "via-indigo-300",
    gradientTo: "to-sky-400",
    accentColor: "sky",
    badgeText: "100 affirmations \u00e0 trancher",
    metricName: "Niveau de discernement",
    hostGameName: "Vrai ou Faux",
    hasKaraoke: false,
    narrationSubject: "le vrai et le faux",
  },
  insolite: {
    id: "insolite",
    name: "INSOLITE",
    subtitle: "Le saviez-vous ? Faits \u00e9tonnants",
    emoji: "\ud83d\udca1",
    questionCount: 100,
    gradientFrom: "from-fuchsia-400",
    gradientVia: "via-pink-300",
    gradientTo: "to-fuchsia-400",
    accentColor: "fuchsia",
    badgeText: "100 faits insolites",
    metricName: "Culture insolite",
    hostGameName: "Le Saviez-vous",
    hasKaraoke: false,
    narrationSubject: "les faits les plus insolites",
  },
  marques: {
    id: "marques",
    name: "MARQUES",
    subtitle: "Slogans, logos et grandes marques",
    emoji: "\ud83c\udff7\ufe0f",
    questionCount: 100,
    gradientFrom: "from-red-400",
    gradientVia: "via-yellow-300",
    gradientTo: "to-red-400",
    accentColor: "red",
    badgeText: "100 questions sur les marques",
    metricName: "Niveau marketing",
    hostGameName: "Marques & Logos",
    hasKaraoke: false,
    narrationSubject: "les marques et leurs slogans",
  },
};

export function getQuizConfig(type: QuizType): QuizConfig {
  return CONFIGS[type] || CONFIGS.logique;
}

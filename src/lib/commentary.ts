import { estimateIQ, iqLabel, getEndGameMetric } from "./scoring";
import type { QuizType } from "./types";
import { getQuizConfig } from "./quiz-config";

const DIFFICULTY_NAMES = ["", "trivial", "facile", "facile plus", "moyen moins", "moyen", "moyen plus", "difficile", "très difficile", "expert", "impossible"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// === INTRO SEGMENTÉE ===

export interface IntroSegment {
  key: string;
  text: string;
}

export function rulesIntroSegments(playerNames: string[], isSolo: boolean, quizType: QuizType = "logique"): IntroSegment[] {
  const last = playerNames[playerNames.length - 1];
  const allButLast = playerNames.slice(0, -1).join(", ");
  const namesList = playerNames.length > 1 ? `${allButLast} et ${last}` : playerNames[0];
  const config = getQuizConfig(quizType);
  const isActu = quizType === "actualite";

  return [
    {
      key: "title",
      text: isActu
        ? `Bonsoir à tous ! Je suis Benoît, votre animateur pour ce soir. Bienvenue dans ${config.hostGameName}, le quiz qui va tester votre culture de l'année ! Vous suivez bien l'actu ? On va le vérifier !`
        : "Bonsoir à tous ! Je suis Benoît, votre animateur pour ce soir. Bienvenue dans Logique, le jeu qui va mettre vos cerveaux à rude épreuve ! Vous êtes prêts pour un voyage au cœur de la logique pure ?",
    },
    {
      key: "players",
      text: isSolo
        ? isActu
          ? `Ce soir, ${playerNames[0]} va tenter le défi en solo ! 100 questions sur l'actualité 2025, du niveau trivial jusqu'au niveau expert. Est-ce que vous suivez bien l'actu ? On va le découvrir !`
          : `Ce soir, ${playerNames[0]} va tenter le défi en solo ! 100 questions de logique, du niveau trivial jusqu'au niveau impossible. Est-ce que vous avez ce qu'il faut ? On va le découvrir !`
        : isActu
          ? `Ce soir, nous avons ${namesList} qui vont s'affronter sur 100 questions d'actualité 2025. Que le plus informé gagne !`
          : `Ce soir, nous avons ${namesList} qui vont s'affronter sur 100 questions de logique pure. Que le meilleur cerveau gagne !`,
    },
    {
      key: "phone",
      text: "Alors, comment ça marche ? Regardez votre téléphone. Vous allez voir apparaître 4 gros boutons de couleur. Bleu pour la réponse A, orange pour B, vert pour C, et violet pour D. Ce sont vos buzers ! Quand une question s'affiche sur l'écran, vous appuyez sur le bouton de votre choix. Simple, non ?",
    },
    {
      key: "scoring",
      text: "Parlons des points ! Le système est simple. Plus la question est difficile, plus elle rapporte. Une question de niveau 1, c'est facile, ça donne 100 points maximum. Mais une question de niveau 10, attention, c'est 1000 points ! Les gros scores se font sur les questions difficiles.",
    },
    {
      key: "speed",
      text: "Et surtout, la vitesse compte ! Plus vous répondez vite, plus votre bonus est élevé. Si vous répondez instantanément, vous gagnez le maximum. Si vous attendez jusqu'à la dernière seconde, vous ne gagnez que 25 pour cent des points. Mais attention, une mauvaise réponse, c'est zéro point. Alors réfléchissez, mais ne traînez pas !",
    },
    {
      key: "difficulty",
      text: isActu
        ? "On va commencer tranquillement avec des questions faciles, de la culture générale 2025 bien connue. Mais ne vous endormez pas ! Ça va monter progressivement, et les dernières questions portent sur des détails que seuls les vrais passionnés d'actu connaissent !"
        : "On va commencer tranquillement avec des questions de niveau trivial, pour échauffer les neurones. Mais ne vous endormez pas ! Ça va monter progressivement, et les dernières questions sont de niveau impossible. Même des mathématiciens professionnels s'y cassent les dents !",
    },
    {
      key: "ready",
      text: "À la fin de chaque question, je vous donnerai la bonne réponse et l'explication. Prenez le temps de comprendre. Et quand vous êtes prêts pour la suite, appuyez sur le bouton vert « Je suis prêt » sur votre téléphone. La question suivante ne commencera que quand tout le monde sera prêt.",
    },
    {
      key: "countdown",
      text: isSolo
        ? `Alors ${playerNames[0]}, prêt à relever le défi ? 3, 2, 1, c'est parti !`
        : `Est-ce que tout le monde est prêt ? Alors, 3, 2, 1, c'est parti !`,
    },
  ];
}

// Compat : retourne le texte complet en une string
export function rulesIntro(playerNames: string[], quizType: QuizType = "logique"): string {
  return rulesIntroSegments(playerNames, playerNames.length === 1, quizType)
    .map((s) => s.text)
    .join(" ");
}

// === QUESTION ===

export function questionIntro(questionNum: number, totalQuestions: number, difficulty: number, questionText: string, quizType: QuizType = "logique"): string {
  const diffName = DIFFICULTY_NAMES[difficulty] || "";
  const isActu = quizType === "actualite";
  let intro = "";

  if (questionNum === 1) {
    intro = isActu ? "Première question pour commencer en douceur. " : "Première question pour se mettre en jambes. Niveau trivial. ";
  } else if (questionNum === 10) {
    intro = "Question 10 ! On accélère. ";
  } else if (questionNum === 25) {
    intro = "Question 25, le quart du chemin ! ";
  } else if (questionNum === 50) {
    intro = "La moitié ! Question 50 ! Ça ne rigole plus. ";
  } else if (questionNum === 75) {
    intro = isActu ? "Question 75. Les trois quarts ! Seuls les vrais experts survivent. " : "Question 75. Les trois quarts ! Seuls les vrais logiciens survivent. ";
  } else if (questionNum === 90) {
    intro = "Question 90 ! Zone rouge. Bonne chance. ";
  } else if (questionNum === 100) {
    intro = "Dernière question ! La centième ! Niveau impossible ! ";
  } else if (difficulty >= 9) {
    intro = pick([`Question ${questionNum}. Niveau ${diffName}. Accrochez-vous. `, `Attention, question ${questionNum}. Niveau ${diffName}. `]);
  } else if (difficulty >= 7) {
    intro = pick([`Question ${questionNum}. Niveau ${diffName}. `, `Question ${questionNum}. Ça devient sérieux. `]);
  } else if (difficulty >= 5) {
    intro = pick([`Question ${questionNum}. `, `On continue, question ${questionNum}. `]);
  } else {
    intro = pick([`Question ${questionNum}. `, `Allez, question ${questionNum}. `]);
  }

  return intro + questionText;
}

// === TIMER WARNING ===

export function timerWarning(): string {
  return pick([
    "Plus que 5 secondes ! Dépêchez-vous !",
    "5 secondes ! Il faut buzzer maintenant !",
    "Allez, vite ! Plus que 5 secondes !",
  ]);
}

// === STREAK ===

export function streakComment(playerName: string, streak: number): string {
  if (streak === 3) return `${playerName}, 3 bonnes réponses d'affilée !`;
  if (streak === 5) return `${playerName}, 5 d'affilée ! Impressionnant !`;
  if (streak === 10) return `${playerName}, 10 sans erreur ! Incroyable !`;
  if (streak >= 15) return `${playerName}, ${streak} d'affilée ! Extraterrestre !`;
  return "";
}

// === LEADERBOARD ===

export function leaderboardUpdate(
  scores: { playerName: string; score: number }[],
  questionNum: number
): string {
  if (scores.length <= 1) return `Après ${questionNum} questions, score : ${scores[0]?.score || 0} points.`;
  const leader = scores[0];
  const second = scores[1];
  const gap = leader.score - second.score;
  if (gap <= 100) {
    return `Après ${questionNum} questions, c'est très serré ! ${leader.playerName} mène avec seulement ${gap} points d'avance sur ${second.playerName} !`;
  }
  return `Après ${questionNum} questions, ${leader.playerName} est en tête avec ${leader.score} points.`;
}

// === REVEAL ===

export function revealComment(
  correctAnswer: string,
  explanation: string,
  playerResults: { playerName: string; correct: boolean; pointsEarned: number; previousRank: number; newRank: number }[],
  allPlayers?: { name: string; streak: number }[]
): string {
  let comment = `La bonne réponse était : ${correctAnswer}. `;

  // Solo
  if (playerResults.length === 1) {
    const r = playerResults[0];
    if (r.correct) {
      comment += pick([`Bravo ${r.playerName}, bonne réponse !`, `${r.playerName} a trouvé ! Bien joué !`]);
      if (r.pointsEarned > 0) comment += ` ${r.pointsEarned} points.`;
    } else {
      comment += pick([`Dommage ${r.playerName}, ce n'était pas ça.`, `Incorrect. Pas de panique, on continue !`]);
    }
    comment += " " + explanation;
    return comment;
  }

  // Multi
  const correct = playerResults.filter((r) => r.correct);

  if (correct.length === playerResults.length) {
    comment += pick(["Bravo à tous, tout le monde a trouvé !", "Impressionnant, sans faute !"]);
  } else if (correct.length === 0) {
    comment += pick(["Personne n'a trouvé ! C'était piégeant.", "Zéro bonne réponse ! Celle-là était vicieuse."]);
  } else if (correct.length === 1) {
    comment += `Seul ${correct[0].playerName} a trouvé ! Chapeau !`;
  } else {
    comment += `Bravo à ${correct.map((r) => r.playerName).join(" et ")} !`;
  }

  // Changements de classement
  const newLeader = playerResults.find((r) => r.newRank === 1 && r.previousRank > 1);
  if (newLeader) {
    comment += ` Et ${newLeader.playerName} prend la tête !`;
  }
  const bigRise = playerResults.find((r) => r.previousRank - r.newRank >= 2);
  if (bigRise && bigRise !== newLeader) {
    comment += ` Belle remontée de ${bigRise.playerName} !`;
  }

  // Streaks
  if (allPlayers) {
    for (const p of allPlayers) {
      if (p.streak >= 3) {
        const sc = streakComment(p.name, p.streak);
        if (sc) comment += " " + sc;
      }
    }
  }

  // Points du meilleur
  const topScorer = correct.sort((a, b) => b.pointsEarned - a.pointsEarned)[0];
  if (topScorer && topScorer.pointsEarned > 0) {
    comment += ` ${topScorer.playerName} empoche ${topScorer.pointsEarned} points.`;
  }

  comment += " " + explanation;
  return comment;
}

// === FIN DE PARTIE ===

export function gameOverComment(
  scores: { playerName: string; score: number }[],
  quizType: QuizType = "logique"
): string {
  if (scores.length === 0) return "C'est terminé !";

  const config = getQuizConfig(quizType);
  const metric = scores.length > 0 ? getEndGameMetric(quizType, scores[0].score) : null;

  // Solo
  if (scores.length === 1) {
    const m = getEndGameMetric(quizType, scores[0].score);
    return `C'est terminé ! ${scores[0].playerName}, vous avez obtenu ${scores[0].score} points en solo ! `
      + (quizType === "actualite"
        ? `Votre ${m.metricName} : ${m.value}/100. ${m.label} ! `
        : `Votre ${m.metricName} est estimé à ${m.value}. ${m.label} ! `)
      + `Merci d'avoir joué à ${config.hostGameName} !`;
  }

  // Multi
  const winner = scores[0];
  const second = scores[1];
  const winnerMetric = getEndGameMetric(quizType, winner.score);

  let comment = pick([
    `Et c'est terminé ! Le grand vainqueur est ${winner.playerName} avec ${winner.score} points !`,
    `Fin de la partie ! ${winner.playerName} remporte la victoire avec ${winner.score} points !`,
  ]);

  const gap = winner.score - second.score;
  if (gap <= 200) {
    comment += ` C'était serré ! Seulement ${gap} points d'écart avec ${second.playerName} !`;
  }

  comment += quizType === "actualite"
    ? ` Le ${winnerMetric.metricName} de ${winner.playerName} : ${winnerMetric.value}/100. ${winnerMetric.label} !`
    : ` Le ${winnerMetric.metricName} de ${winner.playerName} est estimé à ${winnerMetric.value}. ${winnerMetric.label} !`;
  comment += ` Bravo à tous et merci d'avoir joué à ${config.hostGameName} !`;

  return comment;
}

import { estimateIQ, iqLabel } from "./scoring";

const DIFFICULTY_NAMES = ["", "trivial", "facile", "facile plus", "moyen moins", "moyen", "moyen plus", "difficile", "tres difficile", "expert", "impossible"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// === INTRO SEGMENTEE ===

export interface IntroSegment {
  key: string;
  text: string;
}

export function rulesIntroSegments(playerNames: string[], isSolo: boolean): IntroSegment[] {
  const last = playerNames[playerNames.length - 1];
  const allButLast = playerNames.slice(0, -1).join(", ");
  const namesList = playerNames.length > 1 ? `${allButLast} et ${last}` : playerNames[0];

  return [
    {
      key: "title",
      text: "Bonsoir a tous ! Je suis Benoit, votre animateur pour ce soir. Bienvenue dans Logique, le jeu qui va mettre vos cerveaux a rude epreuve ! Vous etes prets pour un voyage au coeur de la logique pure ?",
    },
    {
      key: "players",
      text: isSolo
        ? `Ce soir, ${playerNames[0]} va tenter le defi en solo ! 100 questions de logique, du niveau trivial jusqu'au niveau impossible. Est-ce que vous avez ce qu'il faut ? On va le decouvrir !`
        : `Ce soir, nous avons ${namesList} qui vont s'affronter sur 100 questions de logique pure. Que le meilleur cerveau gagne !`,
    },
    {
      key: "phone",
      text: "Alors, comment ca marche ? Regardez votre telephone. Vous allez voir apparaitre 4 gros boutons de couleur. Bleu pour la reponse A, orange pour B, vert pour C, et violet pour D. Ce sont vos buzers ! Quand une question s'affiche sur l'ecran, vous appuyez sur le bouton de votre choix. Simple, non ?",
    },
    {
      key: "scoring",
      text: "Parlons des points ! Le systeme est simple. Plus la question est difficile, plus elle rapporte. Une question de niveau 1, c'est facile, ca donne 100 points maximum. Mais une question de niveau 10, attention, c'est 1000 points ! Les gros scores se font sur les questions difficiles.",
    },
    {
      key: "speed",
      text: "Et surtout, la vitesse compte ! Plus vous repondez vite, plus votre bonus est eleve. Si vous repondez instantanement, vous gagnez le maximum. Si vous attendez jusqu'a la derniere seconde, vous ne gagnez que 25 pour cent des points. Mais attention, une mauvaise reponse, c'est zero point. Alors reflechissez, mais ne trainz pas !",
    },
    {
      key: "difficulty",
      text: "On va commencer tranquillement avec des questions de niveau trivial, pour echauffer les neurones. Mais ne vous endormez pas ! Ca va monter progressivement, et les dernieres questions sont de niveau impossible. Meme des mathematiciens professionnels s'y cassent les dents !",
    },
    {
      key: "ready",
      text: "A la fin de chaque question, je vous donnerai la bonne reponse et l'explication. Prenez le temps de comprendre. Et quand vous etes prets pour la suite, appuyez sur le bouton vert Je suis pret sur votre telephone. La question suivante ne commencera que quand tout le monde sera pret.",
    },
    {
      key: "countdown",
      text: isSolo
        ? `Alors ${playerNames[0]}, pret a relever le defi ? 3, 2, 1, c'est parti !`
        : `Est-ce que tout le monde est pret ? Alors, 3, 2, 1, c'est parti !`,
    },
  ];
}

// Compat : retourne le texte complet en une string
export function rulesIntro(playerNames: string[]): string {
  return rulesIntroSegments(playerNames, playerNames.length === 1)
    .map((s) => s.text)
    .join(" ");
}

// === QUESTION ===

export function questionIntro(questionNum: number, totalQuestions: number, difficulty: number, questionText: string): string {
  const diffName = DIFFICULTY_NAMES[difficulty] || "";
  let intro = "";

  if (questionNum === 1) {
    intro = "Premiere question pour se mettre en jambes. Niveau trivial. ";
  } else if (questionNum === 10) {
    intro = "Question 10 ! On accelere. ";
  } else if (questionNum === 25) {
    intro = "Question 25, le quart du chemin ! ";
  } else if (questionNum === 50) {
    intro = "La moitie ! Question 50 ! Ca ne rigole plus. ";
  } else if (questionNum === 75) {
    intro = "Question 75. Les trois quarts ! Seuls les vrais logiciens survivent. ";
  } else if (questionNum === 90) {
    intro = "Question 90 ! Zone rouge. Bonne chance. ";
  } else if (questionNum === 100) {
    intro = "Derniere question ! La centieme ! Niveau impossible ! ";
  } else if (difficulty >= 9) {
    intro = pick([`Question ${questionNum}. Niveau ${diffName}. Accrochez-vous. `, `Attention, question ${questionNum}. Niveau ${diffName}. `]);
  } else if (difficulty >= 7) {
    intro = pick([`Question ${questionNum}. Niveau ${diffName}. `, `Question ${questionNum}. Ca devient serieux. `]);
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
    "Plus que 5 secondes ! Depechez-vous !",
    "5 secondes ! Il faut buzzer maintenant !",
    "Allez, vite ! Plus que 5 secondes !",
  ]);
}

// === STREAK ===

export function streakComment(playerName: string, streak: number): string {
  if (streak === 3) return `${playerName}, 3 bonnes reponses d'affilee !`;
  if (streak === 5) return `${playerName}, 5 d'affilee ! Impressionnant !`;
  if (streak === 10) return `${playerName}, 10 sans erreur ! Incroyable !`;
  if (streak >= 15) return `${playerName}, ${streak} d'affilee ! Extraterrestre !`;
  return "";
}

// === LEADERBOARD ===

export function leaderboardUpdate(
  scores: { playerName: string; score: number }[],
  questionNum: number
): string {
  if (scores.length <= 1) return `Apres ${questionNum} questions, score : ${scores[0]?.score || 0} points.`;
  const leader = scores[0];
  const second = scores[1];
  const gap = leader.score - second.score;
  if (gap <= 100) {
    return `Apres ${questionNum} questions, c'est tres serre ! ${leader.playerName} mene avec seulement ${gap} points d'avance sur ${second.playerName} !`;
  }
  return `Apres ${questionNum} questions, ${leader.playerName} est en tete avec ${leader.score} points.`;
}

// === REVEAL ===

export function revealComment(
  correctAnswer: string,
  explanation: string,
  playerResults: { playerName: string; correct: boolean; pointsEarned: number; previousRank: number; newRank: number }[],
  allPlayers?: { name: string; streak: number }[]
): string {
  let comment = `La bonne reponse etait : ${correctAnswer}. `;

  // Solo
  if (playerResults.length === 1) {
    const r = playerResults[0];
    if (r.correct) {
      comment += pick([`Bravo ${r.playerName}, bonne reponse !`, `${r.playerName} a trouve ! Bien joue !`]);
      if (r.pointsEarned > 0) comment += ` ${r.pointsEarned} points.`;
    } else {
      comment += pick([`Dommage ${r.playerName}, ce n'etait pas ca.`, `Incorrect. Pas de panique, on continue !`]);
    }
    comment += " " + explanation;
    return comment;
  }

  // Multi
  const correct = playerResults.filter((r) => r.correct);

  if (correct.length === playerResults.length) {
    comment += pick(["Bravo a tous, tout le monde a trouve !", "Impressionnant, sans faute !"]);
  } else if (correct.length === 0) {
    comment += pick(["Personne n'a trouve ! C'etait piegeant.", "Zero bonne reponse ! Celle-la etait vicieuse."]);
  } else if (correct.length === 1) {
    comment += `Seul ${correct[0].playerName} a trouve ! Chapeau !`;
  } else {
    comment += `Bravo a ${correct.map((r) => r.playerName).join(" et ")} !`;
  }

  // Changements de classement
  const newLeader = playerResults.find((r) => r.newRank === 1 && r.previousRank > 1);
  if (newLeader) {
    comment += ` Et ${newLeader.playerName} prend la tete !`;
  }
  const bigRise = playerResults.find((r) => r.previousRank - r.newRank >= 2);
  if (bigRise && bigRise !== newLeader) {
    comment += ` Belle remontee de ${bigRise.playerName} !`;
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
  scores: { playerName: string; score: number }[]
): string {
  if (scores.length === 0) return "C'est termine !";

  // Solo
  if (scores.length === 1) {
    const iq = estimateIQ(scores[0].score);
    const label = iqLabel(iq);
    return `C'est termine ! ${scores[0].playerName}, vous avez obtenu ${scores[0].score} points en solo ! `
      + `Votre QI logique est estime a ${iq}. ${label} ! `
      + `Merci d'avoir joue a Logique !`;
  }

  // Multi
  const winner = scores[0];
  const second = scores[1];
  const winnerIQ = estimateIQ(winner.score);

  let comment = pick([
    `Et c'est termine ! Le grand vainqueur est ${winner.playerName} avec ${winner.score} points !`,
    `Fin de la partie ! ${winner.playerName} remporte la victoire avec ${winner.score} points !`,
  ]);

  const gap = winner.score - second.score;
  if (gap <= 200) {
    comment += ` C'etait serre ! Seulement ${gap} points d'ecart avec ${second.playerName} !`;
  }

  comment += ` Le QI logique de ${winner.playerName} est estime a ${winnerIQ}. ${iqLabel(winnerIQ)} !`;
  comment += " Bravo a tous et merci d'avoir joue a Logique !";

  return comment;
}

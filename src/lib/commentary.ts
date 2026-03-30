const DIFFICULTY_NAMES = ["", "trivial", "facile", "facile plus", "moyen moins", "moyen", "moyen plus", "difficile", "tres difficile", "expert", "impossible"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rulesIntro(playerNames: string[]): string {
  const names = playerNames.join(", ");
  const last = playerNames[playerNames.length - 1];
  const allButLast = playerNames.slice(0, -1).join(", ");
  const namesList = playerNames.length > 1 ? `${allButLast} et ${last}` : names;

  return `Bonsoir a tous ! Je suis Benoit, votre animateur pour ce soir. `
    + `Bienvenue dans Logique, le jeu qui va mettre vos cerveaux a rude epreuve ! `
    + `Ce soir, nous avons ${namesList} qui vont s'affronter sur 100 questions de logique pure. `
    + `On va commencer tranquillement au niveau trivial, mais ne vous endormez pas, `
    + `parce que ca va monter tres vite en difficulte. `
    + `Les dernieres questions sont de niveau impossible. Meme des mathematiciens professionnels s'y cassent les dents ! `
    + `Petit rappel des regles. Le systeme de points est simple : `
    + `plus la question est difficile, plus elle rapporte. `
    + `Une question de niveau 1 donne 100 points maximum, et une question de niveau 10 en donne 1000. `
    + `Et surtout, la vitesse compte ! Plus vous repondez vite, plus votre bonus est eleve. `
    + `Mais attention, une mauvaise reponse ne rapporte rien du tout. Pas de points en moins, mais zero points. `
    + `Alors reflechissez bien, mais ne trainz pas trop. `
    + `Est-ce que tout le monde est pret ? Alors... c'est parti !`;
}

export function questionIntro(questionNum: number, totalQuestions: number, difficulty: number, questionText: string): string {
  const diffName = DIFFICULTY_NAMES[difficulty] || "";

  let intro = "";
  if (questionNum === 1) {
    intro = "Premiere question pour se mettre en jambes. Niveau trivial. ";
  } else if (questionNum === 10) {
    intro = "Question 10 ! On accelere un petit peu. ";
  } else if (questionNum === 25) {
    intro = "Question 25, le quart du chemin. On entre dans le vif du sujet. ";
  } else if (questionNum === 50) {
    intro = "La moitie ! Question 50 ! A partir de maintenant, ca ne rigole plus du tout. ";
  } else if (questionNum === 75) {
    intro = "Question 75. Les trois quarts ! Seuls les vrais logiciens survivent a ce stade. ";
  } else if (questionNum === 90) {
    intro = "Question 90 ! On entre dans la zone rouge. Niveau expert et impossible. Bonne chance a tous. ";
  } else if (questionNum === 100) {
    intro = "Et voici la derniere question ! La centieme ! Niveau impossible ! Montrez ce que vous avez dans le ventre ! ";
  } else if (difficulty >= 9) {
    intro = pick([
      `Question ${questionNum}. Niveau ${diffName}. Accrochez-vous tres fort. `,
      `Attention, question ${questionNum}. Niveau ${diffName}. Ca va faire mal. `,
    ]);
  } else if (difficulty >= 7) {
    intro = pick([
      `Question ${questionNum}. Niveau ${diffName}. Ca devient serieux. `,
      `Question ${questionNum}. On est dans le dur maintenant. `,
    ]);
  } else if (difficulty >= 5) {
    intro = pick([
      `Question ${questionNum}. Niveau ${diffName}. `,
      `On continue avec la question ${questionNum}. `,
    ]);
  } else {
    intro = pick([
      `Question ${questionNum}. `,
      `Allez, question ${questionNum}. `,
    ]);
  }

  return intro + questionText;
}

export function revealComment(
  correctAnswer: string,
  explanation: string,
  playerResults: { playerName: string; correct: boolean; pointsEarned: number; previousRank: number; newRank: number }[]
): string {
  const correct = playerResults.filter((r) => r.correct);
  const wrong = playerResults.filter((r) => !r.correct);

  let comment = `La bonne reponse etait : ${correctAnswer}. `;

  if (correct.length === playerResults.length) {
    comment += pick([
      "Bravo a tous, tout le monde a trouve !",
      "Impressionnant, sans faute !",
      "Chapeau, vous avez tous bon !",
    ]);
  } else if (correct.length === 0) {
    comment += pick([
      "Et personne n'a trouve ! C'etait piegeant.",
      "Aie, zero bonne reponse ! Celle-la etait vraiment vicieuse.",
      "Personne ! On ne vous en veut pas, c'etait difficile.",
    ]);
  } else if (correct.length === 1) {
    comment += pick([
      `Seul ${correct[0].playerName} a trouve ! Chapeau !`,
      `Bravo ${correct[0].playerName}, le seul a avoir la bonne reponse !`,
    ]);
  } else {
    const names = correct.map((r) => r.playerName).join(" et ");
    comment += `Bravo a ${names} !`;
  }

  // Commentaire sur les changements de classement
  const rankChanges = playerResults.filter((r) => r.previousRank !== r.newRank && r.newRank > 0 && r.previousRank > 0);
  const newLeader = rankChanges.find((r) => r.newRank === 1 && r.previousRank > 1);
  if (newLeader) {
    comment += ` Et ${newLeader.playerName} prend la tete du classement !`;
  } else {
    const bigRise = rankChanges.find((r) => r.newRank < r.previousRank && r.previousRank - r.newRank >= 2);
    if (bigRise) {
      comment += ` Belle remontee de ${bigRise.playerName} qui gagne ${bigRise.previousRank - bigRise.newRank} places !`;
    }
  }

  // Points max gagnes
  const topScorer = correct.sort((a, b) => b.pointsEarned - a.pointsEarned)[0];
  if (topScorer && topScorer.pointsEarned > 0) {
    comment += ` ${topScorer.playerName} empoche ${topScorer.pointsEarned} points.`;
  }

  comment += " " + explanation;

  return comment;
}

export function gameOverComment(
  scores: { playerName: string; score: number }[]
): string {
  if (scores.length === 0) return "C'est termine !";

  const winner = scores[0];
  const second = scores[1];

  let comment = pick([
    `Et c'est termine ! Le grand vainqueur de ce soir est ${winner.playerName} avec ${winner.score} points !`,
    `Fin de la partie ! ${winner.playerName} remporte la victoire avec ${winner.score} points !`,
    `C'est fini ! Et c'est ${winner.playerName} qui s'impose avec ${winner.score} points !`,
  ]);

  if (second) {
    const gap = winner.score - second.score;
    if (gap <= 200) {
      comment += ` C'etait serre ! Seulement ${gap} points d'ecart avec ${second.playerName} !`;
    } else {
      comment += ` ${second.playerName} termine deuxieme avec ${second.score} points.`;
    }
  }

  comment += " Bravo a tous et merci d'avoir joue a Logique ! A la prochaine !";

  return comment;
}

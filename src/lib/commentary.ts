// Commentaires de l'animateur pour chaque phase du jeu

const DIFFICULTY_NAMES = ["", "trivial", "facile", "facile plus", "moyen moins", "moyen", "moyen plus", "difficile", "tres difficile", "expert", "impossible"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rulesIntro(playerNames: string[]): string {
  const names = playerNames.join(", ");
  return `Bienvenue dans Logique ! Le jeu qui va tester vos cerveaux jusqu'a la rupture ! Ce soir, ${names}, vous allez affronter 100 questions de logique. On commence en douceur, mais attention, ca va devenir tres tres complique. Plus vous repondez vite, plus vous gagnez de points. Et surtout, pas de triche ! C'est parti !`;
}

export function questionIntro(questionNum: number, totalQuestions: number, difficulty: number, questionText: string): string {
  const diffName = DIFFICULTY_NAMES[difficulty] || "";

  let intro = "";
  if (questionNum === 1) {
    intro = "Premiere question. On echauffe les neurones. ";
  } else if (questionNum === 10) {
    intro = "Question 10 deja ! On passe a la vitesse superieure. ";
  } else if (questionNum === 25) {
    intro = "Question 25 ! Le quart du chemin. Ca se corse. ";
  } else if (questionNum === 50) {
    intro = "La moitie ! Question 50. A partir de maintenant, ca ne rigole plus. ";
  } else if (questionNum === 75) {
    intro = "Question 75 ! Les trois quarts, et le niveau est devenu serieux. ";
  } else if (questionNum === 90) {
    intro = "Question 90 ! On entre dans la zone impossible. Bonne chance. ";
  } else if (questionNum === 100) {
    intro = "Derniere question ! La centieme ! Niveau impossible. Montrez ce que vous avez dans le ventre. ";
  } else if (difficulty >= 8) {
    intro = pick([
      `Question ${questionNum}. Niveau ${diffName}. Accrochez-vous. `,
      `Attention, question ${questionNum}. C'est du niveau ${diffName}. `,
      `Question ${questionNum}. On est dans le dur. `,
    ]);
  } else if (difficulty >= 5) {
    intro = pick([
      `Question ${questionNum}. Niveau ${diffName}. `,
      `On continue avec la question ${questionNum}. `,
      `Question ${questionNum}. Ca se complique un peu. `,
    ]);
  } else {
    intro = pick([
      `Question ${questionNum}. `,
      `Allez, question ${questionNum}. `,
      `Question suivante, la ${questionNum}. `,
    ]);
  }

  return intro + questionText;
}

export function timeUpComment(): string {
  return pick([
    "Temps ecoule !",
    "C'est fini, le temps est ecoule !",
    "Stop ! On ne repond plus !",
    "Et c'est termine pour cette question !",
  ]);
}

export function revealComment(
  correctAnswer: string,
  explanation: string,
  playerResults: { playerName: string; correct: boolean }[]
): string {
  const correct = playerResults.filter((r) => r.correct);
  const wrong = playerResults.filter((r) => !r.correct);

  let comment = `La bonne reponse etait : ${correctAnswer}. `;

  if (correct.length === playerResults.length) {
    comment += pick([
      "Bravo a tous, tout le monde a trouve !",
      "Impressionnant, sans faute pour tout le monde !",
      "Chapeau ! Vous avez tous bon !",
    ]);
  } else if (correct.length === 0) {
    comment += pick([
      "Et personne n'a trouve ! C'etait piegeant.",
      "Aie, zero bonne reponse ! Pas facile celle-la.",
      "Personne ! Celle-la etait vraiment vicieuse.",
    ]);
  } else if (correct.length === 1) {
    comment += pick([
      `Seul ${correct[0].playerName} a trouve ! Bien joue !`,
      `Bravo ${correct[0].playerName}, le seul a avoir eu la bonne reponse !`,
      `${correct[0].playerName} est le seul a avoir vu juste !`,
    ]);
  } else {
    const names = correct.map((r) => r.playerName).join(" et ");
    comment += pick([
      `Bravo a ${names} !`,
      `${names} ont trouve la bonne reponse !`,
      `Bien joue ${names} !`,
    ]);
  }

  comment += " " + explanation;

  return comment;
}

export function leaderboardComment(
  scores: { playerName: string; score: number }[]
): string {
  if (scores.length < 2) return "";

  const first = scores[0];
  const second = scores[1];
  const gap = first.score - second.score;

  if (gap === 0) {
    return pick([
      `Egalite parfaite entre ${first.playerName} et ${second.playerName} avec ${first.score} points !`,
      `${first.playerName} et ${second.playerName} sont au coude a coude !`,
    ]);
  } else if (gap <= 100) {
    return pick([
      `${first.playerName} mene avec ${first.score} points, mais ${second.playerName} est juste derriere avec seulement ${gap} points d'ecart !`,
      `Ca se joue a rien ! ${first.playerName} devant, ${second.playerName} a ${gap} points derriere.`,
    ]);
  } else {
    return pick([
      `${first.playerName} est en tete avec ${first.score} points ! ${second.playerName} suit a ${second.score} points.`,
      `${first.playerName} domine avec ${first.score} points.`,
    ]);
  }
}

export function gameOverComment(
  scores: { playerName: string; score: number }[]
): string {
  if (scores.length === 0) return "C'est termine !";

  const winner = scores[0];
  return pick([
    `Et c'est termine ! Le grand vainqueur de ce soir est ${winner.playerName} avec ${winner.score} points ! Bravo ! Merci a tous d'avoir joue a Logique !`,
    `Fin de la partie ! ${winner.playerName} remporte la victoire avec ${winner.score} points ! Quel cerveau ! Merci a tous pour cette belle partie !`,
    `C'est fini ! Et c'est ${winner.playerName} qui s'impose avec ${winner.score} points ! Felicitations ! A la prochaine dans Logique !`,
  ]);
}

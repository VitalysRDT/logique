export function calculateScore(
  difficulty: number,
  isCorrect: boolean,
  elapsedMs: number,
  timeLimitMs: number
): number {
  if (!isCorrect) return 0;

  const basePoints = difficulty * 100;
  const speedRatio = Math.max(0, Math.min(1, 1 - elapsedMs / timeLimitMs));
  const speedMultiplier = 0.25 + 0.75 * speedRatio;

  return Math.round(basePoints * speedMultiplier);
}

export function estimateIQ(score: number): number {
  const bp: [number, number][] = [
    [0, 75], [5000, 85], [10000, 95], [15000, 105],
    [20000, 115], [25000, 122], [30000, 130],
    [35000, 138], [40000, 145], [45000, 152],
    [50000, 158], [55000, 165],
  ];

  if (score <= 0) return bp[0][1];
  if (score >= bp[bp.length - 1][0]) return bp[bp.length - 1][1];

  for (let i = 0; i < bp.length - 1; i++) {
    const [s0, iq0] = bp[i];
    const [s1, iq1] = bp[i + 1];
    if (score >= s0 && score <= s1) {
      const t = (score - s0) / (s1 - s0);
      return Math.round(iq0 + t * (iq1 - iq0));
    }
  }
  return 100;
}

export function iqLabel(iq: number): string {
  if (iq >= 160) return "Exceptionnel";
  if (iq >= 145) return "Genie";
  if (iq >= 130) return "Surdoue";
  if (iq >= 115) return "Superieur";
  if (iq >= 100) return "Dans la moyenne";
  if (iq >= 85) return "Moyen";
  return "En progression";
}

export function estimateExpertise(score: number): number {
  const bp: [number, number][] = [
    [0, 0], [5000, 15], [10000, 30], [15000, 42],
    [20000, 52], [25000, 60], [30000, 68],
    [35000, 75], [40000, 82], [45000, 90],
    [50000, 95], [55000, 100],
  ];

  if (score <= 0) return bp[0][1];
  if (score >= bp[bp.length - 1][0]) return bp[bp.length - 1][1];

  for (let i = 0; i < bp.length - 1; i++) {
    const [s0, e0] = bp[i];
    const [s1, e1] = bp[i + 1];
    if (score >= s0 && score <= s1) {
      const t = (score - s0) / (s1 - s0);
      return Math.round(e0 + t * (e1 - e0));
    }
  }
  return 50;
}

export function expertiseLabel(expertise: number): string {
  if (expertise >= 90) return "Encyclopedie vivante";
  if (expertise >= 75) return "Expert en actu";
  if (expertise >= 60) return "Cultive";
  if (expertise >= 42) return "Informe";
  if (expertise >= 25) return "Novice";
  return "Debutant";
}

export function getEndGameMetric(quizType: string, score: number): { value: number; label: string; metricName: string } {
  if (quizType === "actualite") {
    const value = estimateExpertise(score);
    return { value, label: expertiseLabel(value), metricName: "Niveau d'expertise" };
  }
  const value = estimateIQ(score);
  return { value, label: iqLabel(value), metricName: "QI logique" };
}

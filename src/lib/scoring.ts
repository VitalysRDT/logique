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

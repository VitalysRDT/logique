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

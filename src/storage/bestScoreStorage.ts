const BEST_SCORE_KEY = "astro-drift-best-score:v2";

export function readBestScore(): number {
  try {
    const storedValue = localStorage.getItem(BEST_SCORE_KEY)
    if (!storedValue) return 0;
    const parsedValue = Number(storedValue);
    if (!Number.isFinite(parsedValue) || parsedValue < 0 ) return 0;
    return Math.floor(parsedValue);
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): number {
  const normalizedScore = Math.max(0, Math.floor(score));
  const currentBestScore = readBestScore();
  const nextBestScore = Math.max(currentBestScore, normalizedScore);
  try {
    localStorage.setItem(BEST_SCORE_KEY, nextBestScore.toString());
  } catch {
    // write failed (private mode/quota), in-memory score remains valid  
  }
  return nextBestScore;
}

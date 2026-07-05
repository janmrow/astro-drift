export function formatScore(currentScore: number): string {
  return Math.floor(currentScore).toString().padStart(5, "0");
}

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds)}s`;
}

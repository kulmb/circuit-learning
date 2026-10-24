export function starsForHints(hintsUsed: number): 1 | 2 | 3 {
  if (hintsUsed <= 0) {
    return 3;
  }
  if (hintsUsed <= 2) {
    return 2;
  }
  return 1;
}

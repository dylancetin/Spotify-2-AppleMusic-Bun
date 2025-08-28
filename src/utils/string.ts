export function escapeApostrophes(s: string): string {
  return s.replace(/'/g, "\\'");
}
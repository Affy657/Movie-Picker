export function formatTmdbVote(v: number | null | undefined): string | null {
  if (v == null || Number.isNaN(v)) return null;
  return `${(v / 2).toFixed(1)}/5`;
}

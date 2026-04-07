export function formatTmdbVote(v: number | null | undefined): string | null {
  if (v == null || Number.isNaN(v)) return null;
  return `${v.toFixed(1)}/10`;
}

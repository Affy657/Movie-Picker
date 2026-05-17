/**
 * Formate une durée en minutes vers un format compact et lisible.
 * Aligné `formatRuntimeMinutes` web : `70 → '1h10'`, `45 → '45min'`, `0 → null`.
 */
export function formatRuntimeMinutes(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes)) return null;
  const total = Math.floor(minutes);
  if (total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

/**
 * Formate la note TMDB sur 5 (la source est sur 10) avec 1 décimale.
 * Aligné `formatTmdbVote` web : `8.2 → '4.1/5'`.
 */
export function formatTmdbVote(v: number | null | undefined): string | null {
  if (v == null || Number.isNaN(v)) return null;
  return `${(v / 2).toFixed(1)}/5`;
}

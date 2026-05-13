/**
 * Formate la note TMDB pour l'UI : la note source est sur 10, on l'expose sur 5
 * (échelle plus lisible pour les utilisateurs finaux). Une décimale conservée.
 */
export function formatTmdbVote(v: number | null | undefined): string | null {
  if (v == null || Number.isNaN(v)) return null;
  return `${(v / 2).toFixed(1)}/5`;
}

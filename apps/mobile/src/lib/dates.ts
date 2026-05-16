/**
 * Parse une date au format `YYYY-MM-DD` (date locale d'event, sans timezone) en
 * Date à minuit **local** — pas UTC. `new Date('2026-06-15')` est interprété
 * UTC par la spec ECMA, ce qui décale d'un jour pour les TZ négatives.
 */
export function parseLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Compare 2 dates au jour près (ignore l'heure). */
export function compareDayLocal(a: Date, b: Date): -1 | 0 | 1 {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  if (da < db) return -1;
  if (da > db) return 1;
  return 0;
}

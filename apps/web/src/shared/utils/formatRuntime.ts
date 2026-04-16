/**
 * Formate une durée en minutes vers un format compact et lisible.
 *
 * Exemples :
 *   formatRuntimeMinutes(70)   → "1h10"
 *   formatRuntimeMinutes(60)   → "1h"
 *   formatRuntimeMinutes(125)  → "2h05"
 *   formatRuntimeMinutes(45)   → "45min"
 *   formatRuntimeMinutes(null) → null
 *
 * Retourne `null` pour toute valeur invalide, nulle ou ≤ 0 afin que
 * l'appelant puisse simplement masquer la portion durée.
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

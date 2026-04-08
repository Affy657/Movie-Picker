import { REACTION_CATALOG_IDS } from '../constants/reactionCatalog';
import type { MovieReactionAggregate } from '../types/event';

/**
 * `null` côté API = toutes les réactions du catalogue ; `[]` = aucune autorisée.
 */
export function effectiveAllowedReactionIds(
  allowed: string[] | null | undefined
): readonly string[] {
  if (allowed == null) return REACTION_CATALOG_IDS;
  return allowed;
}

/**
 * Texte d’aide « déjà vu par d’autres » (exclut le pseudo courant quand il apparaît dans l’agrégat).
 */
export function othersAlreadySeenHint(
  reactions: MovieReactionAggregate[] | undefined,
  myPseudo: string | null | undefined
): string | null {
  const agg = reactions?.find((r) => r.reactionId === 'already_seen');
  if (!agg || agg.count < 1) return null;

  const imIn = !!myPseudo && agg.pseudos.includes(myPseudo);
  const othersCount = imIn ? agg.count - 1 : agg.count;
  if (othersCount < 1) return null;

  const othersPseudos = myPseudo ? agg.pseudos.filter((p) => p !== myPseudo) : [...agg.pseudos];

  if (othersPseudos.length > 0) {
    const max = 3;
    const shown = othersPseudos.slice(0, max).join(', ');
    const extra = othersPseudos.length > max ? ` (+${othersPseudos.length - max})` : '';
    return `Déjà vu par d'autres : ${shown}${extra}.`;
  }

  return `Déjà vu par ${othersCount} autre${othersCount > 1 ? 's' : ''}.`;
}

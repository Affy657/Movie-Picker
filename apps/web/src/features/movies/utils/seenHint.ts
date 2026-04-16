import type { TranslationKey } from '@/shared/i18n';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/**
 * Construit un indice « déjà vu par X » à partir de la liste de pseudos ayant marqué le film,
 * en excluant le participant courant. Retourne `null` si personne d'autre n'a marqué.
 *
 * Neutre dans la pondération de la roue — c'est un simple indicateur social.
 */
export function othersAlreadySeenHint(
  seenByPseudos: readonly string[] | undefined,
  currentPseudo: string | null | undefined,
  t: Translate
): string | null {
  if (!seenByPseudos || seenByPseudos.length === 0) return null;
  const others = currentPseudo
    ? seenByPseudos.filter((p) => p !== currentPseudo)
    : [...seenByPseudos];
  if (others.length === 0) return null;
  if (others.length === 1) return t('movies.seen.othersHintOne', { a: others[0] ?? '' });
  if (others.length === 2) {
    return t('movies.seen.othersHintTwo', {
      a: others[0] ?? '',
      b: others[1] ?? '',
    });
  }
  const extra = others.length - 2;
  if (extra === 1) {
    return t('movies.seen.othersHintManyOne', {
      a: others[0] ?? '',
      b: others[1] ?? '',
    });
  }
  return t('movies.seen.othersHintManyMany', {
    a: others[0] ?? '',
    b: others[1] ?? '',
    count: extra,
  });
}

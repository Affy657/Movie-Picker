import type { Translate } from '@/features/movies/types';

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

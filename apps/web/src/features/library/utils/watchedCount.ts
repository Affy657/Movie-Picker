import type { Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';

export function watchedCountLabel(count: number, t: Translate): string {
  if (count === 0) return t('watched.countNone');
  return pluralizeCount(count, 'watched.countOne', 'watched.count', t, { count });
}

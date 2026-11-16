import type { Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';

export function watchlistCountLabel(count: number, t: Translate): string {
  return pluralizeCount(count, 'watchlist.header.subtitleOne', 'watchlist.header.subtitle', t, {
    count,
  });
}

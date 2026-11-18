import type { Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';

export function listCountLabel(count: number, t: Translate): string {
  if (count === 0) return t('lists.count.empty');
  return pluralizeCount(count, 'lists.count.one', 'lists.count.many', t, { count });
}

export function publicListCountLabel(
  list: { itemCount: number; memberCount: number },
  t: Translate
): string {
  const films = listCountLabel(list.itemCount, t);
  return list.memberCount > 1 ? t('lists.public.sharedCount', { films }) : films;
}

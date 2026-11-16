import type { Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';

export function proposingLabel(names: readonly string[], t: Translate): string | null {
  const [first, second] = names;
  if (first === undefined) return null;
  if (second === undefined) return t('events.detail.proposingOne', { pseudo: first });
  if (names.length === 2) return t('events.detail.proposingTwo', { first, second });
  return t('events.detail.proposingMany', { count: names.length });
}

export function onlineCountLabel(count: number, t: Translate): string {
  return pluralizeCount(count, 'events.detail.onlineCountOne', 'events.detail.onlineCount', t);
}

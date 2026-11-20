import type { Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';

export function membersCountLabel(count: number, t: Translate): string {
  return pluralizeCount(count, 'groups.membersCountOne', 'groups.membersCount', t);
}

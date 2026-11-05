import type { Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';

export function participantsCountLabel(count: number, t: Translate): string {
  return pluralizeCount(
    count,
    'events.detail.participantsToggleOne',
    'events.detail.participantsToggle',
    t
  );
}

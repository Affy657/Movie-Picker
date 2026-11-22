import type { Translate } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { firstName } from '@/features/library/utils/listMembers';

export interface GroupPerson {
  userId: string;
  displayName: string;
}

export function membersCountLabel(count: number, t: Translate): string {
  return pluralizeCount(count, 'groups.membersCountOne', 'groups.membersCount', t);
}

export function viewerFirst<T extends GroupPerson>(
  people: readonly T[],
  viewerId: string | undefined
): T[] {
  return [...people].sort((a, b) => Number(b.userId === viewerId) - Number(a.userId === viewerId));
}

export function personName(
  person: GroupPerson,
  viewerId: string | undefined,
  t: Translate
): string {
  return person.userId === viewerId ? t('groups.members.you') : firstName(person.displayName);
}

export function peoplePhrase(
  names: readonly string[],
  total: number,
  maxNamed: number,
  locale: LocaleCode,
  t: Translate
): string {
  const list = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' });
  if (names.length >= total && total <= maxNamed) return list.format(names.slice(0, total));
  const shown = names.slice(0, Math.max(1, maxNamed - 1));
  const others = pluralizeCount(
    total - shown.length,
    'groups.page.othersOne',
    'groups.page.others',
    t
  );
  return list.format([...shown, others]);
}

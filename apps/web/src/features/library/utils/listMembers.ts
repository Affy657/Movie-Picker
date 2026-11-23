import type { Translate, TranslationKey } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { withElision } from '@/shared/i18n/withElision';
import type { MovieContributor } from '@/features/movies/components/movieCardParts';
import type { MovieListAudience, MovieListPerson } from '@/features/library/api/listsApi';

const NAMED_COMPANIONS = 2;

export function isSharedList(list: MovieListAudience): boolean {
  return (list.memberCount ?? 1) > 1;
}

export function isMemberList(list: MovieListAudience): boolean {
  return list.role === 'member';
}

export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? '';
}

export function contributorFrom(
  person: { avatarId: string | null; name: string; isViewer: boolean },
  labelKeys: { byYou: TranslationKey; by: TranslationKey },
  t: Translate
): MovieContributor {
  const name = person.isViewer ? t('lists.members.you') : firstName(person.name);
  return {
    avatarId: person.avatarId,
    pseudo: person.name,
    name,
    label: person.isViewer ? t(labelKeys.byYou) : t(labelKeys.by, { name }),
  };
}

export function listCompanions(
  list: MovieListAudience,
  viewerId: string | undefined
): MovieListPerson[] {
  return (list.memberPreview ?? []).filter((person) => person.userId !== viewerId);
}

function namedPhrase(names: string[], unnamed: number, t: Translate): string {
  const [a = '', b = ''] = names;
  if (names.length >= NAMED_COMPANIONS) {
    if (unnamed === 0) return t('lists.members.withTwo', { a, b });
    return pluralizeCount(unnamed, 'lists.members.withTwoMoreOne', 'lists.members.withTwoMore', t, {
      a,
      b,
    });
  }
  if (unnamed === 0) return t('lists.members.withOne', { a });
  return pluralizeCount(unnamed, 'lists.members.withOneMoreOne', 'lists.members.withOneMore', t, {
    a,
  });
}

export function membersPhrase(
  list: MovieListAudience,
  viewerId: string | undefined,
  t: Translate
): string | null {
  if (!isSharedList(list)) return null;
  const others = (list.memberCount ?? 1) - 1;
  const names = listCompanions(list, viewerId)
    .slice(0, NAMED_COMPANIONS)
    .map((person) => firstName(person.displayName));
  if (names.length === 0) return t('lists.members.withCount', { count: others });
  return namedPhrase(names, Math.max(0, others - names.length), t);
}

export { withElision };

export function listOfLabel(displayName: string, t: Translate): string {
  return withElision(
    firstName(displayName),
    'lists.members.listOf',
    'lists.members.listOfElided',
    t
  );
}

export function listCompanionLabel(
  list: MovieListAudience,
  viewerId: string | undefined,
  t: Translate
): string | null {
  if (isMemberList(list) && list.owner) return listOfLabel(list.owner.displayName, t);
  return membersPhrase(list, viewerId, t);
}

export function capitalizeFirst(text: string, locale: LocaleCode): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

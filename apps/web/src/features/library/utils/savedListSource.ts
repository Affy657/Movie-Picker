import type { Translate, TranslationKey } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { isShowcaseTheme, THEME_LABEL_KEYS } from '@/features/movies/showcaseSections';
import { collectionDisplayName } from '@/features/movies/utils/collectionName';
import type { ListCreator } from '@/features/library/api/listsApi';
import type {
  SavedListSource,
  SavedListSourceType,
  SavedListSummary,
} from '@/features/library/api/savedListsApi';
import { firstName, withElision } from '@/features/library/utils/listMembers';

type ExplorerSourceType = Exclude<SavedListSourceType, 'memberList'>;

const EXPLORER_OVERLINE_KEYS: Record<ExplorerSourceType, TranslationKey> = {
  tmdbCollection: 'lists.saved.overlineCollection',
  explorerTheme: 'lists.saved.overlineTheme',
};

const EXPLORER_LINK_KEYS: Record<ExplorerSourceType, TranslationKey> = {
  tmdbCollection: 'lists.saved.viewCollection',
  explorerTheme: 'lists.saved.viewTheme',
};

const EXPLORER_UNAVAILABLE_KEYS: Record<ExplorerSourceType, TranslationKey> = {
  tmdbCollection: 'lists.saved.unavailableTitleCollection',
  explorerTheme: 'lists.saved.unavailableTitleTheme',
};

type NamedSource = SavedListSource & { name: string | null };

type SourceOfList = Pick<
  SavedListSummary,
  'sourceType' | 'sourceId' | 'creator' | 'unavailable' | 'unavailableReason'
>;

interface SavedListSourceLink {
  to: string;
  label: string;
}

export function savedListName(list: NamedSource, t: Translate): string {
  if (list.name === null) return t('lists.saved.deletedName');
  if (list.sourceType === 'tmdbCollection') return collectionDisplayName(list.name);
  if (list.sourceType === 'memberList') return list.name;
  return isShowcaseTheme(list.sourceId) ? t(THEME_LABEL_KEYS[list.sourceId]) : list.name;
}

export function savedListOverline(list: SourceOfList, t: Translate): string {
  if (list.sourceType !== 'memberList') return t(EXPLORER_OVERLINE_KEYS[list.sourceType]);
  return list.creator
    ? t('lists.saved.overlineMemberList', { handle: list.creator.handle })
    : t('lists.saved.overlineMemberListUnknown');
}

function memberListLink(creator: ListCreator, listId: string, t: Translate): SavedListSourceLink {
  return {
    to: ROUTES.publicList(creator.handle, listId),
    label: withElision(
      firstName(creator.displayName),
      'lists.saved.viewOnProfile',
      'lists.saved.viewOnProfileElided',
      t
    ),
  };
}

export function savedListSourceLink(list: SourceOfList, t: Translate): SavedListSourceLink | null {
  if (list.sourceType === 'tmdbCollection') {
    return {
      to: ROUTES.movieCollection(list.sourceId),
      label: t(EXPLORER_LINK_KEYS.tmdbCollection),
    };
  }
  if (list.sourceType === 'explorerTheme') {
    return { to: ROUTES.showcaseTheme(list.sourceId), label: t(EXPLORER_LINK_KEYS.explorerTheme) };
  }
  if (list.unavailable || !list.creator) return null;
  return memberListLink(list.creator, list.sourceId, t);
}

export function savedListUnavailableTitle(list: SourceOfList, t: Translate): string {
  if (list.sourceType !== 'memberList') return t(EXPLORER_UNAVAILABLE_KEYS[list.sourceType]);
  if (list.unavailableReason !== 'private') return t('lists.saved.unavailableDeleted');
  return list.creator
    ? t('lists.saved.unavailablePrivate', { name: firstName(list.creator.displayName) })
    : t('lists.saved.unavailablePrivateUnknown');
}

export function canCopySavedList(
  list: Pick<SavedListSummary, 'unavailable' | 'copyAvailable'>
): boolean {
  return list.copyAvailable ?? !list.unavailable;
}

export function isGoneMemberList(list: Pick<SavedListSummary, 'sourceType' | 'unavailable'>) {
  return list.sourceType === 'memberList' && list.unavailable;
}

import type { ReactNode } from 'react';
import { BookmarkCheck, ChevronRight, Compass, Layers } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import AvatarStack from '@/shared/components/AvatarStack';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import type { MovieListAudience } from '@/features/library/api/listsApi';
import type { SavedListSourceType } from '@/features/library/api/savedListsApi';
import {
  capitalizeFirst,
  firstName,
  listCompanions,
  membersPhrase,
} from '@/features/library/utils/listMembers';
import { isMemberSource } from '@/features/library/utils/savedListSource';
import styles from './ListSource.module.css';

interface ListCreator {
  displayName: string;
  avatarId?: string | null;
}

export function ListCompanions({
  list,
  viewerId,
}: Readonly<{ list: MovieListAudience; viewerId: string | undefined }>) {
  const { t, locale } = useTranslation();
  const phrase = membersPhrase(list, viewerId, t);
  if (!phrase) return null;
  const people = listCompanions(list, viewerId).map((person) => ({
    key: person.userId,
    avatarId: person.avatarId,
    pseudo: person.displayName,
  }));
  return (
    <>
      <AvatarStack people={people} />
      <span className={styles.text}>{capitalizeFirst(phrase, locale)}</span>
    </>
  );
}

export function CreatorSource({ creator }: Readonly<{ creator: ListCreator }>) {
  const { t } = useTranslation();
  return (
    <>
      <Avatar avatarId={creator.avatarId} pseudo={creator.displayName} size="xs" />
      <span className={styles.text}>
        {t('lists.summary.byCreator', { name: firstName(creator.displayName) })}
      </span>
    </>
  );
}

export function CatalogSource({ kind }: Readonly<{ kind: 'saga' | 'selection' }>) {
  const { t } = useTranslation();
  const Icon = kind === 'saga' ? Layers : Compass;
  return (
    <>
      <Icon size={ICON_SIZE.sm} aria-hidden className={styles.icon} />
      <span className={styles.text}>
        {t(kind === 'saga' ? 'lists.summary.sagaTag' : 'lists.summary.explorerSelection')}
      </span>
    </>
  );
}

export function SavedListSource({
  list,
}: Readonly<{ list: { sourceType: SavedListSourceType; creator?: ListCreator | null } }>) {
  if (isMemberSource(list.sourceType)) {
    return list.creator ? <CreatorSource creator={list.creator} /> : null;
  }
  return <CatalogSource kind={list.sourceType === 'tmdbCollection' ? 'saga' : 'selection'} />;
}

export function SavedMark() {
  const { t } = useTranslation();
  return (
    <>
      <BookmarkCheck size={ICON_SIZE.sm} aria-hidden className={styles.icon} />
      <span className={styles.text}>{t('lists.saved.saved')}</span>
    </>
  );
}

export function ListSourceButton({
  onClick,
  children,
}: Readonly<{ onClick: () => void; children: ReactNode }>) {
  return (
    <button type="button" className={styles.button} onClick={onClick}>
      {children}
      <ChevronRight size={ICON_SIZE.sm} aria-hidden className={styles.icon} />
    </button>
  );
}

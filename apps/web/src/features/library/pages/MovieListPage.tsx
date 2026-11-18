import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronRight, Globe, Link2, LogOut, Pencil, Rows3, Trash2, Users } from 'lucide-react';
import AvatarStack from '@/shared/components/AvatarStack';
import Chip from '@/shared/components/Chip';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { MenuItem, MenuSeparator } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage, isNotFoundError } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useShareAction } from '@/shared/hooks/useShareAction';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { toAddTitleBody } from '@/shared/utils/titleSummary';
import { useTranslation, type Translate } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { MovieContributor } from '@/features/movies/components/movieCardParts';
import { useWatchlistToggle } from '@/features/library/hooks/useWatchlistToggle';
import ListMoviesPage, {
  type ListMoviesCardActions,
} from '@/features/library/components/ListMoviesPage';
import type {
  MovieListDetail,
  MovieListItem,
  MovieListPerson,
} from '@/features/library/api/listsApi';
import ListActionsMenu from '@/features/library/components/ListActionsMenu';
import AvatarOverline from '@/features/library/components/AvatarOverline';
import CopyLinkStatus from '@/features/library/components/CopyLinkStatus';
import ListFormDialog from '@/features/library/components/ListFormDialog';
import ListMembersDialog from '@/features/library/components/ListMembersDialog';
import ListNotFound from '@/features/library/components/ListNotFound';
import ListProgress from '@/features/library/components/ListProgress';
import {
  useAddListItem,
  useDeleteList,
  useList,
  useRemoveListItem,
} from '@/features/library/hooks/useLists';
import { useLeaveList } from '@/features/library/hooks/useListMembers';
import { useListItemsView } from '@/features/library/hooks/useListItemsView';
import { listCountLabel } from '@/features/library/utils/listCount';
import {
  capitalizeFirst,
  firstName,
  isMemberList,
  isSharedList,
  listCompanions,
  membersPhrase,
} from '@/features/library/utils/listMembers';
import { listPageLabels } from '@/features/library/utils/listPageLabels';
import styles from './MovieListPage.module.css';

type ListDialog = 'edit' | 'delete' | 'leave' | 'members' | null;

function deleteMessage(count: number, t: Translate): string {
  if (count === 0) return t('lists.delete.messageEmpty');
  if (count === 1) return t('lists.delete.messageOne');
  return t('lists.delete.message', { count });
}

function publicPageOf(list: MovieListDetail): string | null {
  const handle = list.owner?.handle;
  return list.isPublic && handle ? ROUTES.publicList(handle, list.id) : null;
}

function MovieListActionsMenu({
  list,
  onOpen,
  onCopyLink,
}: Readonly<{
  list: MovieListDetail;
  onOpen: (dialog: ListDialog) => void;
  onCopyLink?: () => void;
}>) {
  const { t } = useTranslation();
  const member = isMemberList(list);
  return (
    <ListActionsMenu>
      {(pick) => (
        <>
          {member ? null : (
            <MenuItem
              icon={<Pencil aria-hidden size={ICON_SIZE.sm} />}
              aria-haspopup="dialog"
              onClick={pick(() => onOpen('edit'))}
            >
              {t('lists.page.edit')}
            </MenuItem>
          )}
          {onCopyLink ? (
            <MenuItem icon={<Link2 aria-hidden size={ICON_SIZE.sm} />} onClick={pick(onCopyLink)}>
              {t('lists.page.copyLink')}
            </MenuItem>
          ) : null}
          <MenuItem
            icon={<Users aria-hidden size={ICON_SIZE.sm} />}
            aria-haspopup="dialog"
            onClick={pick(() => onOpen('members'))}
          >
            {t('lists.members.open')}
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            tone="danger"
            icon={
              member ? (
                <LogOut aria-hidden size={ICON_SIZE.sm} />
              ) : (
                <Trash2 aria-hidden size={ICON_SIZE.sm} />
              )
            }
            aria-haspopup="dialog"
            onClick={pick(() => onOpen(member ? 'leave' : 'delete'))}
          >
            {member ? t('lists.leave.action') : t('lists.page.delete')}
          </MenuItem>
        </>
      )}
    </ListActionsMenu>
  );
}

function PublicListMenu({
  list,
  publicPage,
  onOpen,
}: Readonly<{
  list: MovieListDetail;
  publicPage: string;
  onOpen: (dialog: ListDialog) => void;
}>) {
  const share = useShareAction(absoluteUrl(publicPage), list.name, undefined, 'list');
  return (
    <>
      <CopyLinkStatus copied={share.copied} />
      <MovieListActionsMenu list={list} onOpen={onOpen} onCopyLink={() => void share.copyLink()} />
    </>
  );
}

function OwnListMenu({
  list,
  onOpen,
}: Readonly<{ list: MovieListDetail; onOpen: (dialog: ListDialog) => void }>) {
  const publicPage = publicPageOf(list);
  if (!publicPage) return <MovieListActionsMenu list={list} onOpen={onOpen} />;
  return <PublicListMenu list={list} publicPage={publicPage} onOpen={onOpen} />;
}

function PublicBadge() {
  const { t } = useTranslation();
  return (
    <Chip size="sm" tone="muted" icon={Globe}>
      {t('lists.page.publicBadge')}
    </Chip>
  );
}

function CreatorOverline({ owner }: Readonly<{ owner: MovieListPerson }>) {
  const { t } = useTranslation();
  return (
    <AvatarOverline avatarId={owner.avatarId} pseudo={owner.displayName}>
      {t('lists.members.createdBy', { name: firstName(owner.displayName) })}
    </AvatarOverline>
  );
}

function MembersPill({
  list,
  viewerId,
  onOpen,
}: Readonly<{ list: MovieListDetail; viewerId: string | undefined; onOpen: () => void }>) {
  const { t, locale } = useTranslation();
  const phrase = membersPhrase(list, viewerId, t);
  if (!phrase) return null;
  const people = listCompanions(list, viewerId).map((person) => ({
    key: person.userId,
    avatarId: person.avatarId,
    pseudo: person.displayName,
  }));
  return (
    <Chip
      tone="primary"
      size="sm"
      className={styles.membersPill}
      leading={<AvatarStack people={people} className={styles.membersFaces} />}
      trailingIcon={ChevronRight}
      onClick={onOpen}
    >
      {capitalizeFirst(phrase, locale)}
    </Chip>
  );
}

function contributorOf(
  person: MovieListPerson | null | undefined,
  viewerId: string | undefined,
  t: Translate
): MovieContributor | null {
  if (!person) return null;
  const isViewer = person.userId === viewerId;
  return {
    avatarId: person.avatarId,
    pseudo: person.displayName,
    name: isViewer ? t('lists.members.you') : firstName(person.displayName),
    label: isViewer
      ? t('lists.members.addedByYou')
      : t('lists.members.addedBy', { name: firstName(person.displayName) }),
  };
}

function useContributors(
  list: MovieListDetail | undefined,
  viewerId: string | undefined
): ListMoviesCardActions<MovieListItem>['contributor'] {
  const { t } = useTranslation();
  return useMemo(() => {
    if (!list || !isSharedList(list)) return undefined;
    return {
      columnLabel: t('lists.members.addedByColumn'),
      of: (entry: MovieListItem) => contributorOf(entry.addedBy, viewerId, t),
    };
  }, [list, viewerId, t]);
}

function MovieListDialogs({
  list,
  dialog,
  onClose,
  onError,
}: Readonly<{
  list: MovieListDetail;
  dialog: ListDialog;
  onClose: () => void;
  onError: (message: string) => void;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteList = useDeleteList();
  const leaveList = useLeaveList();
  const member = isMemberList(list);

  const settle = async (action: Promise<void>, fallback: string) => {
    try {
      await action;
      onClose();
      void navigate(ROUTES.lists, { replace: true });
    } catch (error) {
      onClose();
      onError(getErrorMessage(error, fallback));
    }
  };

  return (
    <>
      {dialog === 'edit' ? (
        <ListFormDialog mode="edit" list={list} onClose={onClose} onSaved={onClose} />
      ) : null}
      {member ? (
        <ConfirmDialog
          open={dialog === 'leave'}
          title={t('lists.leave.title', { name: list.name })}
          message={t('lists.leave.message', {
            owner: firstName(list.owner?.displayName ?? ''),
          })}
          confirmLabel={t('lists.leave.action')}
          cancelLabel={t('lists.leave.cancel')}
          loading={leaveList.isPending}
          onConfirm={() => void settle(leaveList.mutateAsync(list.id), t('lists.leave.error'))}
          onCancel={onClose}
          testId="leave-list-dialog"
        />
      ) : (
        <ConfirmDialog
          open={dialog === 'delete'}
          title={t('lists.delete.title', { name: list.name })}
          message={deleteMessage(list.items.length, t)}
          confirmLabel={t('lists.delete.confirm')}
          cancelLabel={t('lists.form.cancel')}
          loading={deleteList.isPending}
          onConfirm={() => void settle(deleteList.mutateAsync(list.id), t('lists.delete.error'))}
          onCancel={onClose}
          testId="delete-list-dialog"
        />
      )}
      {dialog === 'members' ? <ListMembersDialog list={list} onClose={onClose} /> : null}
    </>
  );
}

export default function MovieListPage() {
  const { t } = useTranslation();
  const { listId } = useParams();
  const { user } = useAuth();
  const listQuery = useList(listId, { enabled: !!user });
  const list = listQuery.data;
  useNoindexPage(pageTitle(list?.name ?? t('lists.title')), ROUTES.list(listId ?? ''));

  const watchlistToggle = useWatchlistToggle(!!user);
  const addItem = useAddListItem();
  const removeItem = useRemoveListItem();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ListDialog>(null);

  const { items, watchedCount, isWatched } = useListItemsView(list);
  const contributor = useContributors(list, user?.userId);

  if (listQuery.isError && isNotFoundError(listQuery.error)) {
    return (
      <ListNotFound
        title={t('lists.page.notFoundTitle')}
        message={t('lists.page.notFoundMessage')}
      />
    );
  }

  const name = list?.name ?? null;

  return (
    <ListMoviesPage
      title={name}
      subtitle={list ? listCountLabel(list.items.length, t) : null}
      description={list?.description}
      items={items}
      isLoading={listQuery.isPending}
      isError={listQuery.isError}
      storageScope="list"
      storageListId={listId}
      randomPickHistoryKey="list.randomPick"
      emptyIcon={<Rows3 aria-hidden size={ICON_SIZE['3xl']} />}
      labels={{
        ...listPageLabels(
          name ?? '',
          { title: t('lists.page.emptyTitle'), message: t('lists.page.emptyMessage') },
          t
        ),
        addPanelTitle: t('lists.page.addPanelTitle', { name: name ?? '' }),
      }}
      header={{
        stackedOnMobile: true,
        overline:
          list && isMemberList(list) && list.owner ? (
            <CreatorOverline owner={list.owner} />
          ) : undefined,
        members: list ? (
          <MembersPill list={list} viewerId={user?.userId} onOpen={() => setDialog('members')} />
        ) : null,
        progress:
          items.length > 0 ? <ListProgress watched={watchedCount} total={items.length} /> : null,
        badge: list?.isPublic ? <PublicBadge /> : null,
        menu: list ? <OwnListMenu list={list} onOpen={setDialog} /> : null,
      }}
      card={{
        inWatchlist: (entry) => watchlistToggle.has(entry),
        isWatched,
        showListBadge: true,
        contributor,
        onToggleWatchlist: (entry) => watchlistToggle.toggle(entry),
        onRemoveFromList: (entry) => {
          if (!list) return;
          setRemoveError(null);
          removeItem.mutate(
            { listId: list.id, tmdbId: entry.tmdbId, mediaType: entry.mediaType },
            {
              onError: (error) =>
                setRemoveError(getErrorMessage(error, t('lists.page.removeError'))),
            }
          );
        },
        error: removeError ?? watchlistToggle.error,
      }}
      onAddItem={async (item) => {
        if (!list) return;
        await addItem.mutateAsync({
          listId: list.id,
          item: toAddTitleBody(item),
        });
      }}
    >
      {list ? (
        <MovieListDialogs
          list={list}
          dialog={dialog}
          onClose={() => setDialog(null)}
          onError={setRemoveError}
        />
      ) : null}
    </ListMoviesPage>
  );
}

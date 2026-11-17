import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BookmarkX, CloudOff, Compass, Copy, Layers, UserRound } from 'lucide-react';
import Button from '@/shared/components/Button';
import { MenuItem, MenuSeparator } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage, isNotFoundError } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation, type Translate } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useWatchlistToggle } from '@/features/watchlist/hooks/useWatchlistToggle';
import ListActionsMenu from '@/features/watchlist/components/ListActionsMenu';
import ListMoviesPage from '@/features/watchlist/components/ListMoviesPage';
import type { WatchlistSortConfig } from '@/features/watchlist/components/WatchlistToolbar';
import { useDimWatched } from '@/features/watched/hooks/useDimWatched';
import type { SavedListDetail } from '@/features/lists/api/savedListsApi';
import ListFormDialog from '@/features/lists/components/ListFormDialog';
import ListNotFound from '@/features/lists/components/ListNotFound';
import ListProgress from '@/features/lists/components/ListProgress';
import SavedToggleButton from '@/features/lists/components/SavedToggleButton';
import { useSavedList, useUnsaveList } from '@/features/lists/hooks/useSavedLists';
import { useListItemsView } from '@/features/lists/hooks/useListItemsView';
import { listCountLabel } from '@/features/lists/utils/listCount';
import {
  canCopySavedList,
  isGoneMemberList,
  savedListName,
  savedListOverline,
  savedListSourceLink,
  savedListUnavailableTitle,
} from '@/features/lists/utils/savedListSource';
import { listPageLabels, type ListEmptyTexts } from '@/features/lists/utils/listPageLabels';

function SavedListActionsMenu({
  list,
  onCopy,
  onUnsave,
}: Readonly<{ list: SavedListDetail; onCopy: () => void; onUnsave: () => void }>) {
  const { t } = useTranslation();
  const sourceLink = savedListSourceLink(list, t);
  const SourceIcon = list.sourceType === 'memberList' ? UserRound : Compass;
  return (
    <ListActionsMenu>
      {(pick) => (
        <>
          {canCopySavedList(list) ? (
            <MenuItem
              icon={<Copy aria-hidden size={ICON_SIZE.sm} />}
              aria-haspopup="dialog"
              onClick={pick(onCopy)}
            >
              {t('lists.saved.copy')}
            </MenuItem>
          ) : null}
          {sourceLink ? (
            <MenuItem icon={<SourceIcon aria-hidden size={ICON_SIZE.sm} />} to={sourceLink.to}>
              {sourceLink.label}
            </MenuItem>
          ) : null}
          {canCopySavedList(list) || sourceLink ? <MenuSeparator /> : null}
          <MenuItem
            tone="danger"
            icon={<BookmarkX aria-hidden size={ICON_SIZE.sm} />}
            onClick={pick(onUnsave)}
          >
            {t('lists.saved.unsave')}
          </MenuItem>
        </>
      )}
    </ListActionsMenu>
  );
}

function GoneListActions({
  list,
  unsaving,
  onCopy,
  onUnsave,
}: Readonly<{
  list: SavedListDetail;
  unsaving: boolean;
  onCopy: () => void;
  onUnsave: () => void;
}>) {
  const { t } = useTranslation();
  return (
    <>
      {canCopySavedList(list) ? (
        <Button type="button" variant="primary" aria-haspopup="dialog" onClick={onCopy}>
          {t('lists.saved.keepCopy')}
        </Button>
      ) : null}
      <Button type="button" disabled={unsaving} onClick={onUnsave}>
        {t('lists.saved.unsave')}
      </Button>
    </>
  );
}

type ListMoviesHeader = NonNullable<ComponentProps<typeof ListMoviesPage>['header']>;

function unsaveButtonSlot(
  list: SavedListDetail | undefined,
  unsaving: boolean,
  onUnsave: () => void
): ListMoviesHeader['leading'] {
  return ({ isMobile }) =>
    list ? (
      <SavedToggleButton saved compact={isMobile} disabled={unsaving} onClick={onUnsave} />
    ) : null;
}

function emptyTexts(list: SavedListDetail | undefined, t: Translate): ListEmptyTexts {
  if (!list?.unavailable) {
    return { title: t('lists.saved.emptyTitle'), message: t('lists.saved.emptyMessage') };
  }
  if (!isGoneMemberList(list)) {
    return {
      title: savedListUnavailableTitle(list, t),
      message: t('lists.saved.unavailableMessage'),
    };
  }
  return {
    title: savedListUnavailableTitle(list, t),
    message: canCopySavedList(list)
      ? t('lists.saved.unavailableCopyMessage')
      : t('lists.saved.unavailableUnsaveMessage'),
  };
}

export default function SavedListPage() {
  const { t } = useTranslation();
  const { savedListId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const listQuery = useSavedList(savedListId, { enabled: !!user });
  const list = listQuery.data;
  const name = list ? savedListName(list, t) : null;
  useNoindexPage(pageTitle(name ?? t('lists.title')), ROUTES.savedList(savedListId ?? ''));

  const watchlistToggle = useWatchlistToggle(!!user);
  const unsave = useUnsaveList();
  const dim = useDimWatched();
  const [actionError, setActionError] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  const { items, watchedCount, isWatched } = useListItemsView(list);
  const sorts = useMemo<WatchlistSortConfig>(
    () => ({
      keys: ['relevance', 'title', 'year'],
      labels: { year: t('lists.saved.sortYear') },
      defaultKey: 'relevance',
    }),
    [t]
  );

  if (listQuery.isError && isNotFoundError(listQuery.error)) {
    return (
      <ListNotFound
        title={t('lists.saved.notFoundTitle')}
        message={t('lists.saved.notFoundMessage')}
      />
    );
  }

  const unavailable = !!list?.unavailable;
  const gone = !!list && isGoneMemberList(list);
  const stopSaving = async () => {
    if (!list || unsave.isPending) return;
    setActionError(null);
    try {
      await unsave.mutateAsync(list.id);
      void navigate(ROUTES.lists, { replace: true });
    } catch (error) {
      setActionError(getErrorMessage(error, t('lists.saved.unsaveError')));
    }
  };
  const texts = emptyTexts(list, t);

  let emptyActions: ReactNode;
  if (gone) {
    emptyActions = (
      <GoneListActions
        list={list}
        unsaving={unsave.isPending}
        onCopy={() => setCopyOpen(true)}
        onUnsave={() => void stopSaving()}
      />
    );
  } else if (unavailable) {
    emptyActions = (
      <Button type="button" loading={listQuery.isFetching} onClick={() => void listQuery.refetch()}>
        {t('lists.saved.retry')}
      </Button>
    );
  }

  return (
    <ListMoviesPage
      title={name}
      subtitle={list && !unavailable ? listCountLabel(items.length, t) : null}
      description={gone ? null : list?.description}
      items={items}
      isLoading={listQuery.isPending}
      isError={listQuery.isError}
      storageScope="savedList"
      storageListId={savedListId}
      randomPickHistoryKey="savedList.randomPick"
      emptyIcon={
        unavailable ? (
          <CloudOff aria-hidden size={ICON_SIZE['3xl']} />
        ) : (
          <Layers aria-hidden size={ICON_SIZE['3xl']} />
        )
      }
      emptyActions={emptyActions}
      labels={listPageLabels(name ?? '', texts, t)}
      header={{
        overline: list ? savedListOverline(list, t) : undefined,
        stackedOnMobile: true,
        leading: unsaveButtonSlot(list, unsave.isPending, () => void stopSaving()),
        progress:
          items.length > 0 ? <ListProgress watched={watchedCount} total={items.length} /> : null,
        menu: list ? (
          <SavedListActionsMenu
            list={list}
            onCopy={() => setCopyOpen(true)}
            onUnsave={() => void stopSaving()}
          />
        ) : null,
      }}
      toolbarOptions={{ sorts, dimWatched: { enabled: dim.enabled, onChange: dim.change } }}
      card={{
        inWatchlist: (entry) => watchlistToggle.has(entry),
        isWatched,
        showListBadge: true,
        onToggleWatchlist: (entry) => watchlistToggle.toggle(entry),
        error: actionError ?? dim.error ?? watchlistToggle.error,
      }}
    >
      {copyOpen && list && name ? (
        <ListFormDialog
          mode="copy"
          copyOf={{ savedListId: list.id, name, sourceType: list.sourceType }}
          onClose={() => setCopyOpen(false)}
          onSaved={(created) => {
            setCopyOpen(false);
            void navigate(ROUTES.list(created.id));
          }}
        />
      ) : null}
    </ListMoviesPage>
  );
}

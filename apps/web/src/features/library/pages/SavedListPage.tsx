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
import { useWatchlistToggle } from '@/features/library/hooks/useWatchlistToggle';
import ListActionsMenu from '@/features/library/components/ListActionsMenu';
import ListMoviesPage from '@/features/library/components/ListMoviesPage';
import { sourceOrderSorts } from '@/features/library/components/WatchlistToolbar';
import type { SavedListDetail } from '@/features/library/api/savedListsApi';
import ListFormDialog from '@/features/library/components/ListFormDialog';
import ListNotFound from '@/features/library/components/ListNotFound';
import { SavedListSource } from '@/features/library/components/ListSource';
import SavedToggleButton from '@/features/library/components/SavedToggleButton';
import { useSavedList, useUnsaveList } from '@/features/library/hooks/useSavedLists';
import { useListItemsView } from '@/features/library/hooks/useListItemsView';
import { listCountLabel, withWatchedCount } from '@/features/library/utils/listCount';
import { watchedPercent } from '@/features/library/utils/listProgress';
import { useMovieCollection } from '@/features/movies/hooks/useMovieShowcase';
import {
  canCopySavedList,
  isGoneMemberList,
  isMemberSource,
  savedListName,
  savedListSourceLink,
  savedListUnavailableTitle,
} from '@/features/library/utils/savedListSource';
import { listPageLabels, type ListEmptyTexts } from '@/features/library/utils/listPageLabels';

function SavedListActionsMenu({
  list,
  onCopy,
  onUnsave,
}: Readonly<{ list: SavedListDetail; onCopy: () => void; onUnsave: () => void }>) {
  const { t } = useTranslation();
  const sourceLink = savedListSourceLink(list, t);
  const SourceIcon = isMemberSource(list.sourceType) ? UserRound : Compass;
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
            <MenuItem
              icon={<SourceIcon aria-hidden size={ICON_SIZE.sm} />}
              to={sourceLink.to}
              onClick={pick()}
            >
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
): ListMoviesHeader['primary'] {
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

function useSagaSummary(list: SavedListDetail | undefined): string | null {
  const sagaId = list?.sourceType === 'tmdbCollection' ? Number(list.sourceId) : null;
  return useMovieCollection(sagaId)?.overview ?? null;
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  const { items, watchedCount, isWatched } = useListItemsView(list);
  const sagaSummary = useSagaSummary(list);
  const sorts = useMemo(() => sourceOrderSorts(t), [t]);

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
      subtitle={
        list && !unavailable
          ? withWatchedCount(listCountLabel(items.length, t), watchedCount, t)
          : null
      }
      description={gone ? null : (list?.description ?? sagaSummary)}
      items={items}
      isLoading={listQuery.isPending}
      isError={listQuery.isError}
      storageScope="savedList"
      storageListId={savedListId}
      randomPick={{ historyKey: 'savedList.randomPick', source: 'saved_list' }}
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
        cover: list?.posterPaths,
        progress: watchedPercent(watchedCount, items.length),
        source: list ? <SavedListSource list={list} /> : undefined,
        primary: unsaveButtonSlot(list, unsave.isPending, () => void stopSaving()),
        menu: list ? (
          <SavedListActionsMenu
            list={list}
            onCopy={() => setCopyOpen(true)}
            onUnsave={() => void stopSaving()}
          />
        ) : null,
      }}
      toolbarOptions={{ sorts }}
      card={{
        inWatchlist: (entry) => watchlistToggle.has(entry),
        isWatched,
        showListBadge: true,
        onToggleWatchlist: (entry) => watchlistToggle.toggle(entry),
        error: actionError ?? watchlistToggle.error,
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

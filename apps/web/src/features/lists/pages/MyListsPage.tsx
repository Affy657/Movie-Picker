import { useId, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bookmark, Eye, Layers, Plus } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import Avatar from '@/shared/components/Avatar';
import AvatarStack from '@/shared/components/AvatarStack';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import EmptyState from '@/shared/components/EmptyState';
import InlineError from '@/shared/components/InlineError';
import LinkButton, { linkButtonClass } from '@/shared/components/LinkButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { syncsWithLetterboxd } from '@/features/auth/utils/letterboxdSync';
import type { WatchlistItem } from '@/features/movies/api/watchlistApi';
import MovieCollectionCard from '@/features/movies/components/MovieCollectionCard';
import { useWatchlist } from '@/features/movies/hooks/useWatchlist';
import { watchlistCountLabel } from '@/features/watchlist/utils/watchlistCount';
import type { WatchedMovies } from '@/features/watched/api/watchedApi';
import { useWatchedMovies } from '@/features/watched/hooks/useWatched';
import { watchedCountLabel } from '@/features/watched/utils/watchedCount';
import type { MovieListSummary } from '@/features/lists/api/listsApi';
import type { SavedListSummary } from '@/features/lists/api/savedListsApi';
import ListFormDialog from '@/features/lists/components/ListFormDialog';
import {
  ListCardProgress,
  ListsSkeleton,
  listGridClass,
} from '@/features/lists/components/ListCards';
import ListSummaryToolbar, {
  useListSummaryFilters,
} from '@/features/lists/components/ListSummaryToolbar';
import { useMyLists } from '@/features/lists/hooks/useLists';
import { useSavedLists, useUnsaveList } from '@/features/lists/hooks/useSavedLists';
import { listCountLabel } from '@/features/lists/utils/listCount';
import {
  capitalizeFirst,
  isMemberList,
  listCompanionLabel,
  listCompanions,
  listOfLabel,
} from '@/features/lists/utils/listMembers';
import {
  canCopySavedList,
  isGoneMemberList,
  savedListName,
  savedListUnavailableTitle,
} from '@/features/lists/utils/savedListSource';
import {
  matchesListSearch,
  sortListSummaries,
  type ListSortKey,
} from '@/features/lists/utils/listSummaries';
import { posterStackSources } from '@/features/movies/utils/posterStack';
import styles from './MyListsPage.module.css';

const SYSTEM_LIST_COUNT = 2;

const NO_WATCHED: WatchedMovies = { items: [], total: 0 };

const MY_LIST_SORTS: readonly ListSortKey[] = ['recent', 'name', 'size', 'progress'];

function useLatestPosterSources(items: readonly { posterPath?: string | null }[]): string[] {
  return useMemo(() => posterStackSources(items.map((item) => item.posterPath)), [items]);
}

function LetterboxdTag() {
  const { t } = useTranslation();
  return (
    <Chip size="sm" tone="success">
      {t('lists.summary.letterboxdTag')}
    </Chip>
  );
}

function WatchlistCard({
  items,
  letterboxd,
}: Readonly<{ items: readonly WatchlistItem[]; letterboxd: boolean }>) {
  const { t } = useTranslation();
  const stackSrcs = useLatestPosterSources(items);
  return (
    <MovieCollectionCard
      to={ROUTES.watchlist}
      name={t('watchlist.title')}
      movieCountLabel={watchlistCountLabel(items.length, t)}
      stackSrcs={stackSrcs}
      badgeIcon={<Bookmark aria-hidden size={ICON_SIZE.sm} fill="currentColor" />}
      extra={letterboxd ? <LetterboxdTag /> : undefined}
    />
  );
}

function WatchedCard({
  watched,
  letterboxd,
}: Readonly<{ watched: WatchedMovies; letterboxd: boolean }>) {
  const { t } = useTranslation();
  const stackSrcs = useLatestPosterSources(watched.items);
  return (
    <MovieCollectionCard
      to={ROUTES.watchedMovies}
      name={t('watched.title')}
      movieCountLabel={watchedCountLabel(watched.total, t)}
      stackSrcs={stackSrcs}
      badgeIcon={<Eye aria-hidden size={ICON_SIZE.sm} />}
      extra={letterboxd ? <LetterboxdTag /> : undefined}
    />
  );
}

function ListCompanions({
  list,
  viewerId,
}: Readonly<{ list: MovieListSummary; viewerId: string | undefined }>) {
  const { t, locale } = useTranslation();
  const label = listCompanionLabel(list, viewerId, t);
  if (!label) return null;
  const text = capitalizeFirst(label, locale);
  if (isMemberList(list)) return <span className={styles.companions}>{text}</span>;
  const people = listCompanions(list, viewerId).map((person) => ({
    key: person.userId,
    avatarId: person.avatarId,
    pseudo: person.displayName,
  }));
  return (
    <span className={styles.companions}>
      <AvatarStack people={people} ariaLabel={text} />
    </span>
  );
}

function CreatedListCard({
  list,
  viewerId,
}: Readonly<{ list: MovieListSummary; viewerId: string | undefined }>) {
  const { t } = useTranslation();
  const hasCompanions = listCompanionLabel(list, viewerId, t) !== null;
  const hasProgress = list.itemCount > 0;
  return (
    <MovieCollectionCard
      to={ROUTES.list(list.id)}
      name={list.name}
      movieCountLabel={listCountLabel(list.itemCount, t)}
      stackSrcs={posterStackSources(list.posterPaths)}
      extra={
        hasCompanions || hasProgress ? (
          <>
            <ListCompanions list={list} viewerId={viewerId} />
            {hasProgress ? (
              <ListCardProgress watched={list.watchedCount ?? 0} total={list.itemCount} />
            ) : null}
          </>
        ) : undefined
      }
    />
  );
}

interface SavedListEntry {
  summary: SavedListSummary;
  name: string;
  itemCount: number;
  watchedCount: number;
  updatedAt: string;
}

interface SavedListActions {
  copy: (entry: SavedListEntry) => void;
  unsave: (id: string) => void;
  unsavingId: string | null;
}

function toSavedEntry(summary: SavedListSummary, t: Translate): SavedListEntry {
  return {
    summary,
    name: savedListName(summary, t),
    itemCount: summary.unavailable ? 0 : summary.itemCount,
    watchedCount: summary.watchedCount,
    updatedAt: summary.createdAt,
  };
}

function SourceTag({ summary }: Readonly<{ summary: SavedListSummary }>) {
  const { t, locale } = useTranslation();
  if (summary.sourceType === 'memberList') {
    const { creator } = summary;
    if (!creator) return null;
    return (
      <Chip
        size="sm"
        leading={<Avatar avatarId={creator.avatarId} pseudo={creator.displayName} size="xs" />}
      >
        {capitalizeFirst(listOfLabel(creator.displayName, t), locale)}
      </Chip>
    );
  }
  if (summary.sourceType === 'tmdbCollection') {
    return (
      <Chip size="sm" tone="warning" icon={Layers}>
        {t('lists.summary.sagaTag')}
      </Chip>
    );
  }
  return (
    <Chip size="sm" tone="primary">
      {t('lists.summary.explorerTag')}
    </Chip>
  );
}

function savedCountLabel(summary: SavedListSummary, t: Translate): string {
  if (isGoneMemberList(summary)) return savedListUnavailableTitle(summary, t);
  if (summary.unavailable) return t('lists.summary.unavailable');
  return listCountLabel(summary.itemCount, t);
}

function GoneListActions({
  entry,
  actions,
}: Readonly<{ entry: SavedListEntry; actions: SavedListActions }>) {
  const { t } = useTranslation();
  return (
    <>
      {canCopySavedList(entry.summary) ? (
        <LinkButton size="sm" aria-haspopup="dialog" onClick={() => actions.copy(entry)}>
          {t('lists.saved.keepCopy')}
        </LinkButton>
      ) : null}
      <LinkButton
        size="sm"
        disabled={actions.unsavingId === entry.summary.id}
        onClick={() => actions.unsave(entry.summary.id)}
      >
        {t('lists.saved.unsave')}
      </LinkButton>
    </>
  );
}

function SavedListCard({
  entry,
  actions,
}: Readonly<{ entry: SavedListEntry; actions: SavedListActions }>) {
  const { t } = useTranslation();
  const { summary } = entry;
  return (
    <MovieCollectionCard
      to={ROUTES.savedList(summary.id)}
      name={entry.name}
      movieCountLabel={savedCountLabel(summary, t)}
      stackSrcs={posterStackSources(summary.posterPaths)}
      extra={
        <>
          {entry.itemCount > 0 ? (
            <ListCardProgress watched={entry.watchedCount} total={entry.itemCount} />
          ) : null}
          <SourceTag summary={summary} />
        </>
      }
      footer={
        isGoneMemberList(summary) ? <GoneListActions entry={entry} actions={actions} /> : null
      }
    />
  );
}

function Floor({
  title,
  action,
  children,
}: Readonly<{ title: string; action?: ReactNode; children: ReactNode }>) {
  const headingId = useId();
  return (
    <section className={styles.floor} aria-labelledby={headingId}>
      <div className={styles.floorHead}>
        <h2 id={headingId} className={styles.floorTitle}>
          {title}
        </h2>
        <span className={styles.floorRule} aria-hidden />
        {action}
      </div>
      {children}
    </section>
  );
}

function SavedFloor({
  entries,
  failed,
  isFiltered,
  onRetry,
  actions,
}: Readonly<{
  entries: readonly SavedListEntry[];
  failed: boolean;
  isFiltered: boolean;
  onRetry: () => void;
  actions: SavedListActions;
}>) {
  const { t } = useTranslation();
  let body: ReactNode = null;
  if (failed) {
    body = (
      <InlineError
        message={t('lists.summary.savedLoadError')}
        retryLabel={t('lists.summary.retry')}
        onRetry={onRetry}
      />
    );
  } else if (entries.length > 0) {
    body = (
      <ul className={listGridClass} aria-label={t('lists.summary.savedGridAria')}>
        {entries.map((entry) => (
          <SavedListCard key={entry.summary.id} entry={entry} actions={actions} />
        ))}
      </ul>
    );
  } else if (!isFiltered) {
    body = <p className={styles.floorHint}>{t('lists.summary.savedHint')}</p>;
  }
  if (!body) return null;
  return (
    <Floor
      title={t('lists.summary.savedFloor')}
      action={
        <Link to={ROUTES.movieCollections} className={linkButtonClass({ size: 'sm' })}>
          {t('lists.summary.browseCollections')}
        </Link>
      }
    >
      {body}
    </Floor>
  );
}

function summaryCountLabel(total: number, savedCount: number, t: Translate): string {
  if (savedCount === 1) return t('lists.summary.countWithSavedOne', { count: total });
  if (savedCount > 1) return t('lists.summary.countWithSaved', { count: total, saved: savedCount });
  return pluralizeCount(total, 'lists.summary.countOne', 'lists.summary.count', t, {
    count: total,
  });
}

function FirstListHint({ onCreate }: Readonly<{ onCreate: () => void }>) {
  const { t } = useTranslation();
  return (
    <div className={styles.firstListHint}>
      <p className={styles.firstListText}>{t('lists.summary.firstListHint')}</p>
      <Button type="button" variant="primary" size="sm" onClick={onCreate}>
        <Plus aria-hidden size={ICON_SIZE.md} />
        {t('lists.summary.firstListCta')}
      </Button>
    </div>
  );
}

function ListsCollection({
  created,
  saved,
  watchlistItems,
  watched,
  letterboxd,
  isMobile,
  viewerId,
  onCreate,
  onRetrySaved,
  savedActions,
}: Readonly<{
  viewerId: string | undefined;
  created: readonly MovieListSummary[];
  saved: readonly SavedListSummary[] | null;
  watchlistItems: readonly WatchlistItem[];
  watched: WatchedMovies;
  letterboxd: { watchlist: boolean; watched: boolean };
  isMobile: boolean;
  onCreate: () => void;
  onRetrySaved: () => void;
  savedActions: SavedListActions;
}>) {
  const { t } = useTranslation();
  const filters = useListSummaryFilters();
  const { search, sortBy, sortDir, isFiltered } = filters;

  const visibleCreated = useMemo(
    () =>
      sortListSummaries(
        created.filter((list) => matchesListSearch(list.name, search)),
        sortBy,
        sortDir
      ),
    [created, search, sortBy, sortDir]
  );
  const savedEntries = useMemo(
    () => (saved ?? []).map((summary) => toSavedEntry(summary, t)),
    [saved, t]
  );
  const visibleSaved = useMemo(
    () =>
      sortListSummaries(
        savedEntries.filter((entry) => matchesListSearch(entry.name, search)),
        sortBy,
        sortDir
      ),
    [savedEntries, search, sortBy, sortDir]
  );
  const showWatchlist = matchesListSearch(t('watchlist.title'), search);
  const showWatched = matchesListSearch(t('watched.title'), search);
  const ownCount = visibleCreated.length + Number(showWatchlist) + Number(showWatched);
  const visibleCount = ownCount + visibleSaved.length;

  return (
    <>
      <ListSummaryToolbar
        filters={filters}
        sortKeys={MY_LIST_SORTS}
        visibleCount={visibleCount}
        total={created.length + SYSTEM_LIST_COUNT + savedEntries.length}
        isMobile={isMobile}
      />

      {visibleCount === 0 ? (
        <EmptyState
          compact
          icon={<Bookmark aria-hidden size={ICON_SIZE['2xl']} />}
          title={t('lists.summary.noMatchTitle')}
          message={t('lists.summary.noMatchMessage')}
        />
      ) : null}

      {ownCount > 0 ? (
        <Floor title={t('lists.summary.ownFloor')}>
          <ul className={listGridClass} aria-label={t('lists.summary.gridAria')}>
            {showWatchlist ? (
              <WatchlistCard items={watchlistItems} letterboxd={letterboxd.watchlist} />
            ) : null}
            {showWatched ? <WatchedCard watched={watched} letterboxd={letterboxd.watched} /> : null}
            {visibleCreated.map((list) => (
              <CreatedListCard key={list.id} list={list} viewerId={viewerId} />
            ))}
          </ul>
          {created.length === 0 && !isFiltered ? <FirstListHint onCreate={onCreate} /> : null}
        </Floor>
      ) : null}

      <SavedFloor
        entries={visibleSaved}
        failed={saved === null}
        isFiltered={isFiltered}
        onRetry={onRetrySaved}
        actions={savedActions}
      />
    </>
  );
}

export default function MyListsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  useNoindexPage(pageTitle(t('lists.title')), ROUTES.lists);

  const listsQuery = useMyLists({ enabled: !!user });
  const watchlistQuery = useWatchlist({ enabled: !!user });
  const watchedQuery = useWatchedMovies({ enabled: !!user });
  const savedQuery = useSavedLists({ enabled: !!user });
  const unsave = useUnsaveList();
  const [createOpen, setCreateOpen] = useState(false);
  const [copied, setCopied] = useState<SavedListEntry | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queries = [listsQuery, watchlistQuery, watchedQuery];
  const isPending = [...queries, savedQuery].some((query) => query.isPending);
  const isError = queries.some((query) => query.isError);
  const savedCount = savedQuery.data?.length ?? 0;
  const total = (listsQuery.data?.length ?? 0) + SYSTEM_LIST_COUNT + savedCount;

  const retry = () => {
    for (const query of queries) {
      if (query.isError) void query.refetch();
    }
  };

  const savedActions: SavedListActions = {
    copy: setCopied,
    unsave: (id) => {
      setActionError(null);
      unsave.mutate(id, {
        onError: (error) => setActionError(getErrorMessage(error, t('lists.saved.unsaveError'))),
      });
    },
    unsavingId: unsave.isPending ? (unsave.variables ?? null) : null,
  };

  let body;
  if (isPending) {
    body = <ListsSkeleton label={t('lists.summary.loading')} />;
  } else if (isError) {
    body = (
      <InlineError
        message={t('lists.summary.loadError')}
        retryLabel={t('lists.summary.retry')}
        onRetry={retry}
      />
    );
  } else {
    body = (
      <ListsCollection
        created={listsQuery.data ?? []}
        saved={savedQuery.isError ? null : (savedQuery.data ?? [])}
        onRetrySaved={() => void savedQuery.refetch()}
        watchlistItems={watchlistQuery.data ?? []}
        watched={watchedQuery.data ?? NO_WATCHED}
        letterboxd={{
          watchlist: syncsWithLetterboxd(user, 'watchlist'),
          watched: syncsWithLetterboxd(user, 'watched'),
        }}
        isMobile={isMobile}
        viewerId={user?.userId}
        onCreate={() => setCreateOpen(true)}
        savedActions={savedActions}
      />
    );
  }

  return (
    <PageLayout className={styles.layout}>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          <h1 className={styles.pageTitle}>{t('lists.title')}</h1>
          {isPending || isError ? null : (
            <p className={styles.pageSubtitle}>{summaryCountLabel(total, savedCount, t)}</p>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          size={isMobile ? 'sm' : 'md'}
          onClick={() => setCreateOpen(true)}
        >
          <Plus aria-hidden size={ICON_SIZE.md} />
          {t(isMobile ? 'lists.summary.newListShort' : 'lists.summary.newList')}
        </Button>
      </div>

      {actionError ? (
        <p className="error" role="alert">
          {actionError}
        </p>
      ) : null}

      {body}

      {createOpen ? (
        <ListFormDialog
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={(list) => {
            setCreateOpen(false);
            void navigate(ROUTES.list(list.id));
          }}
        />
      ) : null}

      {copied ? (
        <ListFormDialog
          mode="copy"
          copyOf={{
            savedListId: copied.summary.id,
            name: copied.name,
            sourceType: copied.summary.sourceType,
          }}
          onClose={() => setCopied(null)}
          onSaved={(list) => {
            setCopied(null);
            void navigate(ROUTES.list(list.id));
          }}
        />
      ) : null}
    </PageLayout>
  );
}

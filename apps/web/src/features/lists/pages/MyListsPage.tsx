import { useId, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Bookmark,
  ChevronRight,
  Compass,
  Eye,
  EyeOff,
  Globe,
  Layers,
  ListPlus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import Avatar from '@/shared/components/Avatar';
import AvatarStack from '@/shared/components/AvatarStack';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import CountBadge from '@/shared/components/CountBadge';
import EmptyState from '@/shared/components/EmptyState';
import InlineError from '@/shared/components/InlineError';
import { linkButtonClass } from '@/shared/components/LinkButton';
import SearchField from '@/shared/components/SearchField';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation, type Translate } from '@/shared/i18n';
import { renderWithBold } from '@/shared/utils/renderWithBold';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { syncsWithLetterboxd } from '@/features/auth/utils/letterboxdSync';
import type { WatchlistItem } from '@/features/movies/api/watchlistApi';
import MovieCollectionCard from '@/features/movies/components/MovieCollectionCard';
import PosterFan from '@/features/movies/components/PosterFan';
import { useWatchlist } from '@/features/movies/hooks/useWatchlist';
import { watchlistCountLabel } from '@/features/watchlist/utils/watchlistCount';
import type { WatchedMovies } from '@/features/watched/api/watchedApi';
import { useWatchedMovies } from '@/features/watched/hooks/useWatched';
import { watchedCountLabel } from '@/features/watched/utils/watchedCount';
import type { MovieListSummary } from '@/features/lists/api/listsApi';
import type { SavedListSummary } from '@/features/lists/api/savedListsApi';
import ListFormDialog from '@/features/lists/components/ListFormDialog';
import ListSortMenu from '@/features/lists/components/ListSortMenu';
import {
  useListSummaryFilters,
  type ListSummaryFilters,
} from '@/features/lists/components/ListSummaryToolbar';
import { useMyLists } from '@/features/lists/hooks/useLists';
import { useSavedLists, useUnsaveList } from '@/features/lists/hooks/useSavedLists';
import { listCountLabel } from '@/features/lists/utils/listCount';
import {
  capitalizeFirst,
  firstName,
  isMemberList,
  listCompanions,
  membersPhrase,
} from '@/features/lists/utils/listMembers';
import { watchedPercent } from '@/features/lists/utils/listProgress';
import {
  canCopySavedList,
  isGoneMemberList,
  savedListName,
} from '@/features/lists/utils/savedListSource';
import {
  matchesListSearch,
  sortListSummaries,
  type ListSortKey,
} from '@/features/lists/utils/listSummaries';
import { posterStackSources } from '@/features/movies/utils/posterStack';
import styles from './MyListsPage.module.css';

const NO_WATCHED: WatchedMovies = { items: [], total: 0 };

const MY_LIST_SORTS: readonly ListSortKey[] = ['recent', 'name', 'size', 'progress'];

const TOOLS_MIN_LISTS = 7;

const SKELETON_ROWS = 4;

function useLatestPosterSources(items: readonly { posterPath?: string | null }[]): string[] {
  return useMemo(() => posterStackSources(items.map((item) => item.posterPath)), [items]);
}

function ShortcutCard({
  to,
  name,
  icon,
  countLabel,
  srcs,
  letterboxd,
  isMobile,
}: Readonly<{
  to: string;
  name: string;
  icon: ReactNode;
  countLabel: string;
  srcs: readonly string[];
  letterboxd: boolean;
  isMobile: boolean;
}>) {
  const { t } = useTranslation();
  const synced = t('lists.page.letterboxdSynced');
  return (
    <Card as={Link} to={to} interactive padding="none" className={styles.shortcut}>
      <PosterFan srcs={srcs} size="md" emptyIcon={icon} />
      <span className={styles.shortcutText}>
        <span className={styles.shortcutName}>
          <span className={styles.shortcutIcon}>{icon}</span>
          <span>{name}</span>
          {letterboxd && isMobile ? (
            <span className={styles.shortcutSyncIcon}>
              <RefreshCw size={ICON_SIZE.sm} aria-hidden />
              <span className="visually-hidden">{synced}</span>
            </span>
          ) : null}
        </span>
        <span className={styles.shortcutCount}>{countLabel}</span>
        {letterboxd && !isMobile ? (
          <span className={styles.shortcutSync}>
            <RefreshCw size={ICON_SIZE.sm} aria-hidden className={styles.shortcutSyncIcon} />
            <span>{synced}</span>
          </span>
        ) : null}
      </span>
      {isMobile ? null : (
        <ChevronRight size={ICON_SIZE.lg} aria-hidden className={styles.shortcutChevron} />
      )}
    </Card>
  );
}

function Shortcuts({
  watchlistItems,
  watched,
  letterboxd,
  isMobile,
}: Readonly<{
  watchlistItems: readonly WatchlistItem[];
  watched: WatchedMovies;
  letterboxd: { watchlist: boolean; watched: boolean };
  isMobile: boolean;
}>) {
  const { t } = useTranslation();
  const watchlistSrcs = useLatestPosterSources(watchlistItems);
  const watchedSrcs = useLatestPosterSources(watched.items);
  return (
    <div className={styles.shortcuts}>
      <ShortcutCard
        to={ROUTES.watchlist}
        name={t('watchlist.title')}
        icon={<Bookmark size={ICON_SIZE.md} fill="currentColor" aria-hidden />}
        countLabel={
          watchlistItems.length === 0
            ? t('lists.count.empty')
            : watchlistCountLabel(watchlistItems.length, t)
        }
        srcs={watchlistSrcs}
        letterboxd={letterboxd.watchlist}
        isMobile={isMobile}
      />
      <ShortcutCard
        to={ROUTES.watchedMovies}
        name={t('watched.title')}
        icon={<Eye size={ICON_SIZE.md} aria-hidden />}
        countLabel={
          watched.total === 0 ? t('lists.count.empty') : watchedCountLabel(watched.total, t)
        }
        srcs={watchedSrcs}
        letterboxd={letterboxd.watched}
        isMobile={isMobile}
      />
    </div>
  );
}

function rowCountLabel(
  itemCount: number,
  watchedCount: number,
  isMobile: boolean,
  t: Translate
): string {
  if (itemCount === 0) return t(isMobile ? 'lists.count.empty' : 'lists.summary.emptyHint');
  const films = listCountLabel(itemCount, t);
  if (watchedCount <= 0) return films;
  if (watchedCount === 1) return t('lists.summary.countWatchedOne', { films });
  return t('lists.summary.countWatched', { films, count: watchedCount });
}

function rowProgress(itemCount: number, watchedCount: number): number | null {
  return watchedCount > 0 ? watchedPercent(watchedCount, itemCount) : null;
}

function Companions({
  list,
  viewerId,
}: Readonly<{ list: MovieListSummary; viewerId: string | undefined }>) {
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
      <span className={styles.who}>{capitalizeFirst(phrase, locale)}</span>
    </>
  );
}

function PublicMark() {
  const { t } = useTranslation();
  return (
    <span className={styles.publicMark}>
      <Globe size={ICON_SIZE.sm} aria-hidden />
      <span className="visually-hidden">{t('lists.page.publicBadge')}</span>
    </span>
  );
}

function CreatedListRow({
  list,
  viewerId,
  isMobile,
}: Readonly<{ list: MovieListSummary; viewerId: string | undefined; isMobile: boolean }>) {
  const { t } = useTranslation();
  const watched = list.watchedCount ?? 0;
  return (
    <MovieCollectionCard
      layout="row"
      to={ROUTES.list(list.id)}
      name={list.name}
      nameSuffix={list.isPublic ? <PublicMark /> : undefined}
      movieCountLabel={rowCountLabel(list.itemCount, watched, isMobile, t)}
      stackSrcs={posterStackSources(list.posterPaths)}
      progress={rowProgress(list.itemCount, watched)}
      emptyIcon={<ListPlus size={ICON_SIZE.lg} />}
      extra={<Companions list={list} viewerId={viewerId} />}
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

function toSavedEntry(summary: SavedListSummary, t: Translate): SavedListEntry {
  return {
    summary,
    name: savedListName(summary, t),
    itemCount: summary.unavailable ? 0 : summary.itemCount,
    watchedCount: summary.watchedCount,
    updatedAt: summary.createdAt,
  };
}

function SavedSource({ summary }: Readonly<{ summary: SavedListSummary }>) {
  const { t } = useTranslation();
  if (summary.sourceType === 'memberList') {
    const { creator } = summary;
    if (!creator) return null;
    return (
      <>
        <Avatar avatarId={creator.avatarId} pseudo={creator.displayName} size="xs" />
        <span className={styles.who}>
          {t('lists.summary.byCreator', { name: firstName(creator.displayName) })}
        </span>
      </>
    );
  }
  const isSaga = summary.sourceType === 'tmdbCollection';
  const Icon = isSaga ? Layers : Compass;
  return (
    <>
      <Icon size={ICON_SIZE.sm} aria-hidden className={styles.whoIcon} />
      <span className={styles.who}>
        {t(isSaga ? 'lists.summary.sagaTag' : 'lists.summary.explorerSelection')}
      </span>
    </>
  );
}

function SavedListRow({ entry, isMobile }: Readonly<{ entry: SavedListEntry; isMobile: boolean }>) {
  const { t } = useTranslation();
  const { summary } = entry;
  return (
    <MovieCollectionCard
      layout="row"
      to={ROUTES.savedList(summary.id)}
      name={entry.name}
      movieCountLabel={
        summary.unavailable
          ? t('lists.summary.unavailable')
          : rowCountLabel(entry.itemCount, entry.watchedCount, isMobile, t)
      }
      stackSrcs={posterStackSources(summary.posterPaths)}
      progress={rowProgress(entry.itemCount, entry.watchedCount)}
      extra={<SavedSource summary={summary} />}
    />
  );
}

interface SavedListActions {
  copy: (entry: SavedListEntry) => void;
  unsave: (id: string) => void;
  unsavingId: string | null;
}

function goneNoticeText(summary: SavedListSummary, t: Translate): string {
  if (summary.name === null) return t('lists.summary.goneDeletedNameless');
  const name = summary.name;
  const creator = summary.creator ? firstName(summary.creator.displayName) : null;
  if (summary.unavailableReason === 'private') {
    return creator
      ? t('lists.summary.gonePrivate', { name, creator })
      : t('lists.summary.gonePrivateUnknown', { name });
  }
  return creator
    ? t('lists.summary.goneDeleted', { name, creator })
    : t('lists.summary.goneDeletedUnknown', { name });
}

function GoneListNotice({
  entry,
  actions,
}: Readonly<{ entry: SavedListEntry; actions: SavedListActions }>) {
  const { t } = useTranslation();
  const { summary } = entry;
  const Icon = summary.unavailableReason === 'private' ? EyeOff : Trash2;
  return (
    <Card surface="sunken" padding="none" className={styles.notice}>
      <Icon size={ICON_SIZE.lg} aria-hidden className={styles.noticeIcon} />
      <p className={styles.noticeText}>{renderWithBold(goneNoticeText(summary, t))}</p>
      <span className={styles.noticeActions}>
        {canCopySavedList(summary) ? (
          <Button
            variant="secondary"
            size="sm"
            aria-haspopup="dialog"
            onClick={() => actions.copy(entry)}
          >
            {t('lists.saved.keepCopy')}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          disabled={actions.unsavingId === summary.id}
          onClick={() => actions.unsave(summary.id)}
        >
          {t('lists.saved.unsave')}
        </Button>
      </span>
    </Card>
  );
}

function ListSection({
  title,
  count,
  action,
  children,
}: Readonly<{ title: string; count?: number; action?: ReactNode; children: ReactNode }>) {
  const headingId = useId();
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.sectionHead}>
        <h2 id={headingId} className={styles.sectionTitle}>
          {title}
          {count === undefined ? null : (
            <>
              {' '}
              <CountBadge value={count} tone="neutral" />
            </>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function FindCollectionsLink() {
  const { t } = useTranslation();
  return (
    <Link to={ROUTES.movieCollections} className={linkButtonClass({ size: 'sm' })}>
      {t('lists.summary.findCollections')}
    </Link>
  );
}

function Welcome() {
  const { t } = useTranslation();
  return (
    <Card surface="sunken" padding="md" className={styles.welcome}>
      <p className={styles.welcomeText}>{t('lists.summary.firstListHint')}</p>
      <p className={styles.welcomeText}>{t('lists.summary.followHint')}</p>
      <FindCollectionsLink />
    </Card>
  );
}

function ListsTools({
  filters,
  isMobile,
}: Readonly<{ filters: ListSummaryFilters; isMobile: boolean }>) {
  const { t } = useTranslation();
  return (
    <div className={styles.tools}>
      <SearchField
        className={styles.search}
        value={filters.search}
        onChange={filters.setSearch}
        placeholder={t('lists.summary.searchPlaceholder')}
        ariaLabel={t('lists.summary.searchLabel')}
      />
      <ListSortMenu filters={filters} sortKeys={MY_LIST_SORTS} isMobile={isMobile} />
    </div>
  );
}

function NoMatch({ filters }: Readonly<{ filters: ListSummaryFilters }>) {
  const { t } = useTranslation();
  return (
    <EmptyState
      compact
      icon={<Search aria-hidden size={ICON_SIZE['2xl']} />}
      title={t('lists.summary.noMatchTitle', { query: filters.search.trim() })}
      message={t('lists.summary.noMatchMessage')}
      actions={
        <Button variant="secondary" size="sm" onClick={() => filters.setSearch('')}>
          {t('lists.summary.clearSearch')}
        </Button>
      }
    />
  );
}

function ListRows({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <ul className={styles.rows} aria-label={label}>
      {children}
    </ul>
  );
}

function SavedSection({
  entries,
  gone,
  failed,
  onRetry,
  actions,
  isMobile,
}: Readonly<{
  entries: readonly SavedListEntry[];
  gone: readonly SavedListEntry[];
  failed: boolean;
  onRetry: () => void;
  actions: SavedListActions;
  isMobile: boolean;
}>) {
  const { t } = useTranslation();
  const title = t('lists.summary.savedSection');
  if (failed) {
    return (
      <ListSection title={title}>
        <InlineError
          message={t('lists.summary.savedLoadError')}
          retryLabel={t('lists.summary.retry')}
          onRetry={onRetry}
        />
      </ListSection>
    );
  }
  if (entries.length === 0 && gone.length === 0) return null;
  return (
    <ListSection
      title={title}
      count={entries.length + gone.length}
      action={<FindCollectionsLink />}
    >
      {gone.map((entry) => (
        <GoneListNotice key={entry.summary.id} entry={entry} actions={actions} />
      ))}
      {entries.length > 0 ? (
        <ListRows label={title}>
          {entries.map((entry) => (
            <SavedListRow key={entry.summary.id} entry={entry} isMobile={isMobile} />
          ))}
        </ListRows>
      ) : null}
    </ListSection>
  );
}

function ListsCollection({
  created,
  saved,
  viewerId,
  isMobile,
  onRetrySaved,
  savedActions,
}: Readonly<{
  created: readonly MovieListSummary[];
  saved: readonly SavedListSummary[] | null;
  viewerId: string | undefined;
  isMobile: boolean;
  onRetrySaved: () => void;
  savedActions: SavedListActions;
}>) {
  const { t } = useTranslation();
  const filters = useListSummaryFilters();
  const { search, sortBy, sortDir, isFiltered } = filters;

  const visibleOwn = useMemo(
    () =>
      sortListSummaries(
        created.filter((list) => !isMemberList(list) && matchesListSearch(list.name, search)),
        sortBy,
        sortDir
      ),
    [created, search, sortBy, sortDir]
  );
  const visibleShared = useMemo(
    () =>
      sortListSummaries(
        created.filter((list) => isMemberList(list) && matchesListSearch(list.name, search)),
        sortBy,
        sortDir
      ),
    [created, search, sortBy, sortDir]
  );
  const savedEntries = useMemo(
    () => (saved ?? []).map((summary) => toSavedEntry(summary, t)),
    [saved, t]
  );
  const goneEntries = useMemo(
    () => (isFiltered ? [] : savedEntries.filter((entry) => isGoneMemberList(entry.summary))),
    [savedEntries, isFiltered]
  );
  const visibleSaved = useMemo(
    () =>
      sortListSummaries(
        savedEntries.filter(
          (entry) => !isGoneMemberList(entry.summary) && matchesListSearch(entry.name, search)
        ),
        sortBy,
        sortDir
      ),
    [savedEntries, search, sortBy, sortDir]
  );

  const showTools = created.length + savedEntries.length >= TOOLS_MIN_LISTS;
  const isNewAccount = created.length === 0 && saved !== null && saved.length === 0;
  const visibleCount = visibleOwn.length + visibleShared.length + visibleSaved.length;
  const ownTitle = t('lists.summary.ownSection');
  const sharedTitle = t('lists.summary.sharedSection');

  if (isNewAccount) return <Welcome />;

  return (
    <>
      {showTools ? <ListsTools filters={filters} isMobile={isMobile} /> : null}

      {isFiltered && visibleCount === 0 ? <NoMatch filters={filters} /> : null}

      {visibleOwn.length > 0 ? (
        <ListSection title={ownTitle} count={visibleOwn.length}>
          <ListRows label={ownTitle}>
            {visibleOwn.map((list) => (
              <CreatedListRow key={list.id} list={list} viewerId={viewerId} isMobile={isMobile} />
            ))}
          </ListRows>
        </ListSection>
      ) : null}

      {visibleShared.length > 0 ? (
        <ListSection title={sharedTitle} count={visibleShared.length}>
          <ListRows label={sharedTitle}>
            {visibleShared.map((list) => (
              <CreatedListRow key={list.id} list={list} viewerId={viewerId} isMobile={isMobile} />
            ))}
          </ListRows>
        </ListSection>
      ) : null}

      <SavedSection
        entries={visibleSaved}
        gone={goneEntries}
        failed={saved === null}
        onRetry={onRetrySaved}
        actions={savedActions}
        isMobile={isMobile}
      />
    </>
  );
}

function ListsLoading({ label }: Readonly<{ label: string }>) {
  return (
    <SkeletonScreen label={label}>
      <div className={styles.shortcuts}>
        <Skeleton variant="block" className={styles.shortcutSkeleton} />
        <Skeleton variant="block" className={styles.shortcutSkeleton} />
      </div>
      <ul className={styles.rows}>
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <li key={index} className={styles.rowSkeleton}>
            <Skeleton variant="poster" className={styles.rowSkeletonPoster} />
            <Skeleton variant="text" width="50%" />
          </li>
        ))}
      </ul>
    </SkeletonScreen>
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
    body = <ListsLoading label={t('lists.summary.loading')} />;
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
      <>
        <Shortcuts
          watchlistItems={watchlistQuery.data ?? []}
          watched={watchedQuery.data ?? NO_WATCHED}
          letterboxd={{
            watchlist: syncsWithLetterboxd(user, 'watchlist'),
            watched: syncsWithLetterboxd(user, 'watched'),
          }}
          isMobile={isMobile}
        />
        <ListsCollection
          created={listsQuery.data ?? []}
          saved={savedQuery.isError ? null : (savedQuery.data ?? [])}
          onRetrySaved={() => void savedQuery.refetch()}
          viewerId={user?.userId}
          isMobile={isMobile}
          savedActions={savedActions}
        />
      </>
    );
  }

  return (
    <PageLayout className={styles.layout}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('lists.title')}</h1>
        <Button
          type="button"
          variant="primary"
          size={isMobile ? 'sm' : 'md'}
          onClick={() => setCreateOpen(true)}
        >
          <Plus aria-hidden size={ICON_SIZE.md} />
          {t('lists.summary.newList')}
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

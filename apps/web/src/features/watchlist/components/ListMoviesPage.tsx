import { useId, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import clsx from 'clsx';
import { Dices, Plus } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import EmptyState from '@/shared/components/EmptyState';
import BackLink from '@/shared/components/BackLink';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import { Skeleton } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import ViewModeToggle, { type MovieViewMode } from '@/shared/components/ViewModeToggle';
import { useLocale, useTranslation, type Translate, type TranslationKey } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useHistoryEntryState } from '@/shared/hooks/useHistoryEntryState';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import { randomIndex } from '@/shared/utils/random';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/shared/utils/safeStorage';
import { ROUTES } from '@/app/routes';
import { MOVIE_PAGE_CHUNKS } from '@/app/routeChunks';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import AddMoviePanel from '@/features/movies/components/AddMoviePanel';
import type { AddMovieFormProps } from '@/features/movies/components/AddMovieForm';
import ActiveFilterChips from '@/features/movies/components/ActiveFilterChips';
import FilteredCollectionLayout, {
  FilterSheet,
  FilteredEmptyState,
  toCollectionToolbarProps,
} from '@/features/movies/components/FilteredCollectionLayout';
import MovieListFiltersPanel from '@/features/movies/components/MovieListFiltersPanel';
import MovieBrowseCard, {
  type MovieAvailability,
} from '@/features/movies/components/MovieBrowseCard';
import { LibraryMovieRowHeader } from '@/features/movies/components/LibraryMovieRow';
import type { MovieContributor } from '@/features/movies/components/movieCardParts';
import { MovieTable } from '@/features/movies/components/MovieTable';
import { useOpenMoviePage } from '@/features/movies/hooks/useOpenMoviePage';
import { watchlistItemKey as itemKey } from '@/features/movies/utils/watchlistItemKey';
import ProposeToEventModal from '@/features/events/components/ProposeToEventModal';
import type { WatchlistToggleItem } from '@/features/watchlist/hooks/useWatchlistToggle';
import {
  useWatchlistToolbar,
  type ToolbarExtraFilter,
  type ToolbarStorageScope,
  type WatchlistEntry,
} from '@/features/watchlist/hooks/useWatchlistToolbar';
import WatchlistToolbar, {
  watchlistRowSorts,
  type WatchlistSortConfig,
} from '@/features/watchlist/components/WatchlistToolbar';
import WatchlistSkeleton from '@/features/watchlist/components/WatchlistSkeleton';
import RandomPickDialog, {
  type RandomPickScope,
} from '@/features/watchlist/components/RandomPickDialog';
import DimWatchedControl, {
  type DimWatchedOption,
} from '@/features/watchlist/components/DimWatchedControl';
import type { PickIndex } from '@/features/watchlist/utils/randomPick';
import styles from './ListMoviesPage.module.css';

const VIEW_MODE_STORAGE_KEY = 'watchlist-view';

const NO_RANDOM_PICK_KEY = 'randomPick.none';

function readStoredViewMode(): MovieViewMode {
  return safeLocalStorageGet(VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'grid';
}

type Toolbar = ReturnType<typeof useWatchlistToolbar>;

function ListFiltersPanel({
  panelId,
  tmdbLanguage,
  labels,
  ratingScale,
  toolbar,
  isMobile,
}: Readonly<{
  panelId: string;
  tmdbLanguage: string;
  labels: Parameters<typeof MovieListFiltersPanel>[0]['labels'];
  ratingScale: Parameters<typeof MovieListFiltersPanel>[0]['ratingScale'];
  toolbar: Toolbar;
  isMobile: boolean;
}>) {
  return (
    <MovieListFiltersPanel
      panelId={panelId}
      tmdbLanguage={tmdbLanguage}
      labels={labels}
      ratingScale={ratingScale}
      selectedGenres={toolbar.selectedGenres}
      onToggleGenre={toolbar.toggleGenre}
      selectedMediaTypes={toolbar.selectedMediaTypes}
      onToggleMediaType={toolbar.toggleMediaType}
      selectedDecade={toolbar.selectedDecade}
      onToggleDecade={toolbar.toggleDecade}
      voteMin={toolbar.voteMin}
      onToggleVoteMin={toolbar.toggleVoteMin}
      runtimeRange={toolbar.runtimeRange}
      onChangeRuntimeRange={toolbar.changeRuntimeRange}
      onReset={isMobile ? undefined : toolbar.clearAllFilters}
    />
  );
}

interface RandomPick {
  items: WatchlistEntry[];
  scope: RandomPickScope;
}

interface OpenRandomPick {
  keys: string[];
  scope: RandomPickScope;
  drawnKey: string | null;
}

function isOpenRandomPick(value: unknown): value is OpenRandomPick | null {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const { keys, scope, drawnKey } = value as Record<string, unknown>;
  return (
    Array.isArray(keys) &&
    keys.every((key) => typeof key === 'string') &&
    (scope === 'list' || scope === 'selection') &&
    (drawnKey === null || typeof drawnKey === 'string')
  );
}

function entryKey(entry: WatchlistEntry): string {
  return itemKey(entry.tmdbId, entry.mediaType);
}

function firstDrawLandingOn(poolSize: number, drawnIndex: number): PickIndex {
  if (drawnIndex < 0) return randomIndex;
  return (length) => (length === poolSize ? drawnIndex : randomIndex(length));
}

function randomPickLabelKey(compact: boolean, isFiltered: boolean): TranslationKey {
  if (compact) return 'watchlist.randomPick.triggerShort';
  return isFiltered ? 'watchlist.randomPick.triggerSelection' : 'watchlist.randomPick.trigger';
}

function RandomPickButton({
  toolbar,
  compact,
  onOpen,
}: Readonly<{
  toolbar: Toolbar;
  compact: boolean;
  onOpen: (pick: RandomPick) => void;
}>) {
  const { t } = useTranslation();
  if (toolbar.visibleItems.length === 0) return null;
  return (
    <Button
      type="button"
      size={compact ? 'sm' : 'md'}
      onClick={() =>
        onOpen({
          items: toolbar.visibleItems,
          scope: toolbar.isFiltered ? 'selection' : 'list',
        })
      }
    >
      <Dices size={ICON_SIZE.md} aria-hidden />
      <span>{t(randomPickLabelKey(compact, toolbar.isFiltered))}</span>
    </Button>
  );
}

function AddButton({
  buttonRef,
  compact,
  label,
  onOpen,
}: Readonly<{
  buttonRef: RefObject<HTMLButtonElement | null>;
  compact: boolean;
  label: string;
  onOpen: () => void;
}>) {
  return (
    <Button
      type="button"
      ref={buttonRef}
      variant="primary"
      size={compact ? 'sm' : 'md'}
      onClick={onOpen}
    >
      <Plus size={ICON_SIZE.md} aria-hidden />
      <span>{label}</span>
    </Button>
  );
}

function addTriggerLabel(labels: ListMoviesLabels, compact: boolean, t: Translate): string {
  if (compact) return labels.addTriggerShort ?? t('watchlist.addPanel.triggerShort');
  return labels.addTrigger ?? t('watchlist.addPanel.trigger');
}

function ListAddPanel({
  open,
  onOpenChange,
  returnFocusRef,
  labels,
  fallbackTitle,
  onAddItem,
  isItemAlreadyAdded,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  labels: ListMoviesLabels;
  fallbackTitle: string;
  onAddItem: AddMovieFormProps['onAddItem'];
  isItemAlreadyAdded?: NonNullable<AddMovieFormProps['isItemAlreadyAdded']>;
}>) {
  const { t } = useTranslation();
  return (
    <div className={open ? styles.addPanelOpenWrap : undefined}>
      <AddMoviePanel
        open={open}
        onOpenChange={onOpenChange}
        hideTrigger
        returnFocusRef={returnFocusRef}
        triggerLabel={labels.addTrigger ?? t('watchlist.addPanel.trigger')}
        panelTitle={labels.addPanelTitle ?? fallbackTitle}
        onAdded={() => undefined}
        onAddItem={onAddItem}
        isItemAlreadyAdded={isItemAlreadyAdded}
        alreadyAddedLabel={labels.alreadyAdded ?? t('watchlist.search.alreadyAdded')}
        alreadyAddedHint={labels.alreadyAdded ?? t('watchlist.search.alreadyAdded')}
        addErrorLabel={labels.addError ?? t('watchlist.addError')}
        searchPlaceholder={labels.addSearchPlaceholder ?? t('watchlist.search.placeholder')}
        searchAriaLabel={labels.addSearchLabel ?? t('watchlist.search.label')}
        searchWrapClassName={styles.searchFixedWidth}
        showWatchProviders={false}
      />
    </div>
  );
}

function PageTitle({
  title,
  loadingLabel,
}: Readonly<{ title: string | null; loadingLabel: string }>) {
  if (title) return <h1 className={styles.pageTitle}>{title}</h1>;
  return (
    <h1 className={styles.pageTitle}>
      <span className="visually-hidden">{loadingLabel}</span>
      <Skeleton variant="text" width="12rem" />
    </h1>
  );
}

function availabilityOf(
  entry: WatchlistEntry,
  availabilityPending: boolean | undefined
): MovieAvailability | undefined {
  if (availabilityPending === undefined) return undefined;
  if (entry.watchProviders) {
    return {
      status: 'ready',
      providers: entry.watchProviders,
      watchPageUrl: entry.tmdbWatchPageUrl ?? null,
    };
  }
  return availabilityPending ? { status: 'pending' } : undefined;
}

interface ListMoviesLabels {
  listAria: string;
  loading: string;
  loadError: string;
  addPanelTitle?: string;
  addTrigger?: string;
  addTriggerShort?: string;
  addSearchLabel?: string;
  addSearchPlaceholder?: string;
  addError?: string;
  alreadyAdded?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchPlaceholderShort?: string;
  emptyTitle: string;
  emptyMessage: string;
}

interface ListMoviesCardActions {
  inWatchlist: (entry: WatchlistEntry) => boolean;
  showListBadge: boolean;
  onToggleWatchlist: (entry: WatchlistEntry) => void;
  onRemoveFromList?: (entry: WatchlistEntry) => void;
  canRemove?: (entry: WatchlistEntry) => boolean;
  removeLabels?: { label: string; ariaLabel: (title: string) => string };
  leadingBadge?: (entry: WatchlistEntry) => ReactNode;
  isWatched?: (entry: WatchlistEntry) => boolean;
  contributor?: {
    columnLabel: string;
    of: (entry: WatchlistEntry) => MovieContributor | null;
  };
  error: string | null;
}

interface ListMoviesHeaderSlots {
  back?: { to: string; label: string };
  overline?: ReactNode;
  leading?: (layout: { isMobile: boolean; hasItems: boolean }) => ReactNode;
  menu?: ReactNode;
  stackedOnMobile?: boolean;
  progress?: ReactNode;
  members?: ReactNode;
  letterboxdSynced?: boolean;
  badge?: ReactNode;
}

interface ListMoviesToolbarOptions {
  sorts?: WatchlistSortConfig;
  scopeFilter?: ToolbarExtraFilter & { control?: ReactNode };
  dimWatched?: DimWatchedOption;
  banner?: ReactNode;
}

function ListMoviesHeader({
  title,
  subtitle,
  description,
  loadingLabel,
  isMobile,
  hasItems,
  slots,
  actions,
}: Readonly<{
  title: string | null;
  subtitle: string | null;
  description?: string | null;
  loadingLabel: string;
  isMobile: boolean;
  hasItems: boolean;
  slots?: ListMoviesHeaderSlots;
  actions: ReactNode;
}>) {
  const { t } = useTranslation();
  const stacked = !!slots?.stackedOnMobile && isMobile;
  return (
    <div className={styles.headerBlock}>
      <BackLink to={slots?.back?.to ?? ROUTES.lists}>
        {slots?.back?.label ?? t('lists.page.back')}
      </BackLink>
      <div className={clsx(styles.pageHeader, stacked && styles.pageHeaderStacked)}>
        <div className={styles.pageTitleGroup}>
          {slots?.overline ? <p className={styles.overline}>{slots.overline}</p> : null}
          <PageTitle title={title} loadingLabel={loadingLabel} />
          {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
        </div>

        <div
          className={clsx(
            isMobile ? styles.headerActionsMobile : styles.headerActions,
            stacked && styles.headerActionsStacked
          )}
        >
          {slots?.leading?.({ isMobile, hasItems })}
          {actions}
          {slots?.menu ? <span className={styles.headerMenu}>{slots.menu}</span> : null}
        </div>
      </div>
      {slots?.letterboxdSynced ? (
        <Chip size="sm" tone="success">
          {t('lists.page.letterboxdSynced')}
        </Chip>
      ) : null}
      {slots?.badge}
      {description ? <p className={styles.description}>{description}</p> : null}
      {slots?.members}
      {slots?.progress ? <div className={styles.progress}>{slots.progress}</div> : null}
    </div>
  );
}

function ToolbarTrailing({
  viewMode,
  onChangeViewMode,
  dimWatched,
  isMobile,
}: Readonly<{
  viewMode: MovieViewMode;
  onChangeViewMode: (mode: MovieViewMode) => void;
  dimWatched?: DimWatchedOption;
  isMobile: boolean;
}>) {
  const viewToggle = <ViewModeToggle value={viewMode} onChange={onChangeViewMode} />;
  if (!dimWatched) return viewToggle;
  return (
    <span className={styles.trailingGroup}>
      <DimWatchedControl {...dimWatched} isMobile={isMobile} />
      {viewToggle}
    </span>
  );
}

interface ListMoviesPageProps {
  title: string | null;
  subtitle: string | null;
  description?: string | null;
  items: WatchlistEntry[];
  isLoading: boolean;
  isError: boolean;
  availabilityPending?: boolean;
  storageScope: ToolbarStorageScope;
  randomPickHistoryKey?: string;
  labels: ListMoviesLabels;
  emptyIcon: ReactNode;
  emptyActions?: ReactNode;
  header?: ListMoviesHeaderSlots;
  toolbarOptions?: ListMoviesToolbarOptions;
  card: ListMoviesCardActions;
  onAddItem?: AddMovieFormProps['onAddItem'];
  isItemAlreadyAdded?: NonNullable<AddMovieFormProps['isItemAlreadyAdded']>;
  children?: ReactNode;
}

export default function ListMoviesPage({
  title,
  subtitle,
  description,
  items,
  isLoading,
  isError,
  availabilityPending,
  storageScope,
  randomPickHistoryKey,
  labels,
  emptyIcon,
  emptyActions,
  header,
  toolbarOptions,
  card,
  onAddItem,
  isItemAlreadyAdded,
  children,
}: Readonly<ListMoviesPageProps>) {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user, isLoading: authLoading } = useAuth();
  const hasHover = useHasHoverCapability();
  const isMobile = useIsMobile();
  const filtersPanelId = useId();

  const entriesByKey = useMemo(
    () => new Map(items.map((entry) => [entryKey(entry), entry])),
    [items]
  );

  const [proposeTarget, setProposeTarget] = useState<WatchlistToggleItem | null>(null);
  const [randomPick, setRandomPick] = useHistoryEntryState<OpenRandomPick | null>(
    randomPickHistoryKey ?? NO_RANDOM_PICK_KEY,
    null,
    isOpenRandomPick
  );
  const { track } = useAnalytics();
  const openRandomPick = (pick: RandomPick) => {
    track('random_pick_opened', { scope: pick.scope, pool: pick.items.length });
    setRandomPick({ keys: pick.items.map(entryKey), scope: pick.scope, drawnKey: null });
  };
  const randomPickItems = useMemo(
    () =>
      (randomPick?.keys ?? []).flatMap((key) => {
        const entry = entriesByKey.get(key);
        return entry ? [entry] : [];
      }),
    [randomPick?.keys, entriesByKey]
  );
  const drawnIndex = randomPickItems.findIndex((entry) => entryKey(entry) === randomPick?.drawnKey);
  const randomPickIndex = useMemo(
    () => firstDrawLandingOn(randomPickItems.length, drawnIndex),
    [randomPickItems.length, drawnIndex]
  );
  const openMoviePage = useOpenMoviePage();
  const openDrawnMoviePage = (item: WatchlistEntry) => {
    setRandomPick((current) => current && { ...current, drawnKey: entryKey(item) });
    openMoviePage(item);
  };
  useIdlePrefetch(MOVIE_PAGE_CHUNKS);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<MovieViewMode>(readStoredViewMode);
  const changeViewMode = (mode: MovieViewMode) => {
    setViewMode(mode);
    safeLocalStorageSet(VIEW_MODE_STORAGE_KEY, mode);
  };
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const filtersPanelRef = useRef<HTMLDivElement>(null);

  const mediaTypeLabels = useMemo(
    () => ({
      movie: t('watchlist.toolbar.filterTypeMovie'),
      tv: t('watchlist.toolbar.filterTypeTv'),
    }),
    [t]
  );

  const filtersLabels = useMemo(
    () => ({
      genre: t('watchlist.toolbar.filterGenre'),
      type: t('watchlist.toolbar.filterType'),
      typeMovie: t('watchlist.toolbar.filterTypeMovie'),
      typeTv: t('watchlist.toolbar.filterTypeTv'),
      decade: t('watchlist.toolbar.filterDecade'),
      voteMin: t('watchlist.toolbar.filterVoteMin'),
      duration: t('watchlist.toolbar.filterDuration'),
      durationMinAria: t('movies.search.durationMinAria'),
      durationMaxAria: t('movies.search.durationMaxAria'),
      resetAll: t('watchlist.toolbar.filtersResetAll'),
    }),
    [t]
  );

  const toolbar = useWatchlistToolbar({
    items,
    userId: user?.userId,
    tmdbLanguage,
    ratingScale: user?.ratingScale,
    mediaTypeLabels,
    storageScope,
    extraFilter: toolbarOptions?.scopeFilter,
    defaultSortBy: toolbarOptions?.sorts?.defaultKey,
  });
  useClickOutside(
    filtersPanelRef,
    () => toolbar.setFiltersOpen(false),
    toolbar.filtersOpen && !isMobile,
    { ignoreSelector: '[data-filters-toggle]' }
  );

  const activeFilterCount = toolbar.activeFilterChips.length;
  const filtersPanel = (
    <ListFiltersPanel
      panelId={filtersPanelId}
      tmdbLanguage={tmdbLanguage}
      labels={filtersLabels}
      ratingScale={user?.ratingScale}
      toolbar={toolbar}
      isMobile={isMobile}
    />
  );
  const openAddPanel = () => setAddPanelOpen(true);
  const listView = viewMode === 'list';
  const withAvailability = availabilityPending !== undefined;
  const searchPlaceholder = (isMobile && labels.searchPlaceholderShort) || labels.searchPlaceholder;
  const addLabel = addTriggerLabel(labels, isMobile, t);
  const dimWatched = !!toolbarOptions?.dimWatched?.enabled;
  const renderItem = (item: WatchlistEntry, index: number) => {
    const removeFromList = card.onRemoveFromList;
    const removable = !!removeFromList && (card.canRemove?.(item) ?? true);
    return (
      <MovieBrowseCard
        key={itemKey(item.tmdbId, item.mediaType)}
        item={item}
        layout={listView ? 'row' : 'grid'}
        isMobile={isMobile}
        availability={listView ? availabilityOf(item, availabilityPending) : undefined}
        hasHover={hasHover}
        isLoggedIn={!!user}
        inWatchlist={card.inWatchlist(item)}
        showListBadge={card.showListBadge}
        eager={listView && index < 3}
        dimmed={dimWatched && !!card.isWatched?.(item)}
        leadingBadge={card.leadingBadge?.(item)}
        contributor={card.contributor?.of(item)}
        withContributor={!!card.contributor}
        onToggleWatchlist={() => card.onToggleWatchlist(item)}
        onRemoveFromList={removable ? () => removeFromList(item) : undefined}
        removeLabel={card.removeLabels?.label}
        removeAriaLabel={card.removeLabels?.ariaLabel(item.title)}
        onProposeToEvent={() => setProposeTarget(item)}
        onOpenDetails={() => openMoviePage(item)}
        onOpenAvailability={() => openMoviePage(item)}
        ratingScale={user?.ratingScale}
      />
    );
  };

  if (authLoading) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{title ?? labels.loading}</h1>
        <WatchlistSkeleton label={labels.loading} gridClassName={styles.grid} />
      </PageLayout>
    );
  }

  return (
    <PageLayout className={styles.layout}>
      <ListMoviesHeader
        title={title}
        subtitle={subtitle}
        description={description}
        loadingLabel={labels.loading}
        isMobile={isMobile}
        hasItems={items.length > 0}
        slots={header}
        actions={
          <>
            {randomPickHistoryKey ? (
              <RandomPickButton toolbar={toolbar} compact={isMobile} onOpen={openRandomPick} />
            ) : null}
            {onAddItem ? (
              <AddButton
                buttonRef={addButtonRef}
                compact={isMobile}
                label={addLabel}
                onOpen={openAddPanel}
              />
            ) : null}
          </>
        }
      />

      {onAddItem ? (
        <ListAddPanel
          open={addPanelOpen}
          onOpenChange={setAddPanelOpen}
          returnFocusRef={addButtonRef}
          labels={labels}
          fallbackTitle={addLabel}
          onAddItem={onAddItem}
          isItemAlreadyAdded={isItemAlreadyAdded}
        />
      ) : null}

      <section className="section">
        <h2 className="visually-hidden">{labels.listAria}</h2>

        {card.error ? (
          <p className="error" role="alert">
            {card.error}
          </p>
        ) : null}

        {isLoading && <WatchlistSkeleton label={labels.loading} gridClassName={styles.grid} />}
        {!isLoading && isError && (
          <p className="error" role="alert">
            {labels.loadError}
          </p>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <EmptyState
            icon={emptyIcon}
            title={labels.emptyTitle}
            message={labels.emptyMessage}
            actions={emptyActions}
          />
        )}
        {!isLoading && !isError && items.length > 0 && (
          <FilteredCollectionLayout
            toolbar={
              <>
                {toolbarOptions?.banner}
                <WatchlistToolbar
                  {...toCollectionToolbarProps(toolbar, {
                    filtersPanelId,
                    activeFilterCount,
                    isMobile,
                  })}
                  withAvailability={withAvailability}
                  sorts={toolbarOptions?.sorts}
                  searchLabel={labels.searchLabel}
                  searchPlaceholder={searchPlaceholder}
                  hideSort={listView && !isMobile}
                  beforeSort={toolbarOptions?.scopeFilter?.control}
                  trailing={
                    <ToolbarTrailing
                      viewMode={viewMode}
                      onChangeViewMode={changeViewMode}
                      dimWatched={toolbarOptions?.dimWatched}
                      isMobile={isMobile}
                    />
                  }
                />
              </>
            }
            desktopFilters={
              toolbar.filtersOpen && !isMobile ? (
                <div ref={filtersPanelRef}>{filtersPanel}</div>
              ) : null
            }
            chips={
              activeFilterCount > 0 ? (
                <ActiveFilterChips
                  chips={toolbar.activeFilterChips}
                  groupAriaLabel={t('watchlist.filter.toggleAria')}
                  removeAriaLabel={t('watchlist.toolbar.removeFilterAria')}
                />
              ) : null
            }
            mobileSheet={
              isMobile ? (
                <FilterSheet
                  open={toolbar.filtersOpen}
                  title={t('watchlist.toolbar.filtersSheetTitle')}
                  onClose={() => toolbar.setFiltersOpen(false)}
                  resetLabel={t('watchlist.toolbar.filtersReset')}
                  applyLabel={pluralizeCount(
                    toolbar.visibleCount,
                    'watchlist.toolbar.filtersApplyOne',
                    'watchlist.toolbar.filtersApply',
                    t
                  )}
                  onReset={toolbar.clearAllFilters}
                >
                  {filtersPanel}
                </FilterSheet>
              ) : null
            }
            emptyFiltered={
              toolbar.visibleItems.length === 0 ? (
                <FilteredEmptyState
                  title={t('watchlist.toolbar.emptyTitle')}
                  message={t('watchlist.toolbar.emptyMessage')}
                  resetLabel={t('watchlist.toolbar.filtersResetAll')}
                  onReset={toolbar.resetAll}
                />
              ) : null
            }
          >
            {listView ? (
              <MovieTable
                listLabel={labels.listAria}
                header={
                  isMobile ? null : (
                    <LibraryMovieRowHeader
                      sorts={watchlistRowSorts(t, withAvailability, toolbarOptions?.sorts)}
                      sortBy={toolbar.sortBy}
                      sortDir={toolbar.sortDir}
                      onSetSort={toolbar.setSortBy}
                      contributorLabel={card.contributor?.columnLabel}
                    />
                  )
                }
              >
                {toolbar.visibleItems.map((item, index) => renderItem(item, index))}
              </MovieTable>
            ) : (
              <ul className={styles.grid} aria-label={labels.listAria}>
                {toolbar.visibleItems.map((item, index) => renderItem(item, index))}
              </ul>
            )}
          </FilteredCollectionLayout>
        )}
      </section>

      {randomPick && !isLoading && (
        <RandomPickDialog
          open={proposeTarget === null}
          items={randomPickItems}
          scope={randomPick.scope}
          ratingScale={user?.ratingScale}
          onClose={() => setRandomPick(null)}
          onPropose={setProposeTarget}
          onOpenDetails={openDrawnMoviePage}
          pickIndex={randomPickIndex}
        />
      )}

      {proposeTarget && (
        <ProposeToEventModal
          open={!!proposeTarget}
          movie={proposeTarget}
          onClose={() => setProposeTarget(null)}
        />
      )}

      {children}
    </PageLayout>
  );
}

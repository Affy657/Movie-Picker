import { useId, useMemo, useRef, useState } from 'react';
import { Bookmark, Import, Plus } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import EmptyState from '@/shared/components/EmptyState';
import SignedOutState from '@/shared/components/SignedOutState';
import SessionCheckErrorState from '@/features/auth/components/SessionCheckErrorState';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { ROUTES } from '@/app/routes';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import AddMoviePanel from '@/features/movies/components/AddMoviePanel';
import ActiveFilterChips from '@/features/movies/components/ActiveFilterChips';
import FilteredCollectionLayout, {
  FilterSheet,
  FilteredEmptyState,
  toCollectionToolbarProps,
} from '@/features/movies/components/FilteredCollectionLayout';
import MovieDetailsModal from '@/features/movies/components/MovieDetailsModal';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import LetterboxdConnectModal from '@/features/letterboxd/components/LetterboxdConnectModal';
import type { MovieMediaType } from '@/shared/types/movie';
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from '@/features/watchlist/hooks/useWatchlist';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';
import { useWatchlistToolbar } from '@/features/watchlist/hooks/useWatchlistToolbar';
import WatchlistToolbar from '@/features/watchlist/components/WatchlistToolbar';
import MovieListFiltersPanel from '@/features/movies/components/MovieListFiltersPanel';
import WatchlistMovieCard from '@/features/watchlist/components/WatchlistMovieCard';
import WatchlistSkeleton from '@/features/watchlist/components/WatchlistSkeleton';
import ViewModeToggle, { type MovieViewMode } from '@/shared/components/ViewModeToggle';
import ProposeToEventModal from '@/features/watchlist/components/ProposeToEventModal';
import styles from './WatchlistPage.module.css';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import Button from '@/shared/components/Button';

function itemKey(tmdbId: number, mediaType: MovieMediaType | undefined): string {
  return `${tmdbId}|${mediaType ?? 'movie'}`;
}

const VIEW_MODE_STORAGE_KEY = 'watchlist-view';

function readStoredViewMode(): MovieViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

function persistViewMode(mode: MovieViewMode) {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    return;
  }
}

export default function WatchlistPage() {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user, isLoading: authLoading, authCheckFailed } = useAuth();
  useNoindexPage(pageTitle(t('watchlist.title')), ROUTES.watchlist);
  const hasHover = useHasHoverCapability();
  const isMobile = useIsMobile();
  const filtersPanelId = useId();

  const { data: items = [], isLoading, isError } = useWatchlist({ enabled: !!user });

  const changeViewMode = (mode: MovieViewMode) => {
    setViewMode(mode);
    persistViewMode(mode);
  };

  const [removeError, setRemoveError] = useState<string | null>(null);
  const [proposeTarget, setProposeTarget] = useState<WatchlistItem | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<WatchlistItem | null>(null);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [letterboxdModalOpen, setLetterboxdModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<MovieViewMode>(readStoredViewMode);
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
  });
  useClickOutside(
    filtersPanelRef,
    () => toolbar.setFiltersOpen(false),
    toolbar.filtersOpen && !isMobile,
    '[data-filters-toggle]'
  );

  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist({
    onError: (err) => setRemoveError(getErrorMessage(err, t('watchlist.removeError'))),
  });

  const inWatchlistKeys = useMemo(
    () => new Set(items.map((i) => itemKey(i.tmdbId, i.mediaType))),
    [items]
  );

  const handleRemove = (tmdbId: number, mediaType: MovieMediaType) => {
    setRemoveError(null);
    removeMutation.mutate({ tmdbId, mediaType });
  };

  const activeFilterCount = toolbar.activeFilterChips.length;
  const filtersPanel = (
    <MovieListFiltersPanel
      panelId={filtersPanelId}
      tmdbLanguage={tmdbLanguage}
      labels={filtersLabels}
      ratingScale={user?.ratingScale}
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
  const subtitle =
    items.length === 1
      ? t('watchlist.header.subtitleOne', { count: 1 })
      : t('watchlist.header.subtitle', { count: items.length });
  const openAddPanel = () => setAddPanelOpen(true);

  if (authLoading) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className="visually-hidden">{t('watchlist.title')}</h1>
        <WatchlistSkeleton label={t('watchlist.loadingDetail')} gridClassName={styles.grid} />
      </PageLayout>
    );
  }

  if (!user && authCheckFailed) {
    return <SessionCheckErrorState />;
  }

  if (!user) {
    return (
      <PageLayout className={styles.layout}>
        <h1 className={styles.pageTitle}>{t('watchlist.title')}</h1>
        <SignedOutState
          icon={<Bookmark aria-hidden size={28} />}
          title={t('watchlist.signedOutTitle')}
          message={t('watchlist.signedOutMessage')}
          returnTo={ROUTES.watchlist}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout className={styles.layout}>
      <div className={styles.headerBlock}>
        <div className={styles.pageHeader}>
          <div className={styles.pageTitleGroup}>
            <h1 className={styles.pageTitle}>{t('watchlist.title')}</h1>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>

          {isMobile ? (
            <div className={styles.headerActionsMobile}>
              {!user?.letterboxdUsername && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLetterboxdModalOpen(true)}
                >
                  <Import size={14} aria-hidden />
                  <span>{t('watchlist.letterboxdCtaShort')}</span>
                </Button>
              )}
              <Button
                type="button"
                ref={addButtonRef}
                variant="primary"
                size="sm"
                onClick={openAddPanel}
              >
                <Plus size={15} aria-hidden />
                <span>{t('watchlist.addPanel.triggerShort')}</span>
              </Button>
            </div>
          ) : (
            <div className={styles.headerActions}>
              {!user?.letterboxdUsername && (
                <Button type="button" variant="ghost" onClick={() => setLetterboxdModalOpen(true)}>
                  <Import size={15} aria-hidden />
                  <span>{t('watchlist.letterboxdCta')}</span>
                </Button>
              )}
              <Button type="button" ref={addButtonRef} variant="primary" onClick={openAddPanel}>
                <Plus size={16} aria-hidden />
                <span>{t('watchlist.addPanel.trigger')}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className={addPanelOpen ? styles.addPanelOpenWrap : undefined}>
        <AddMoviePanel
          open={addPanelOpen}
          onOpenChange={setAddPanelOpen}
          hideTrigger
          returnFocusRef={addButtonRef}
          triggerLabel={t('watchlist.addPanel.trigger')}
          panelTitle={t('watchlist.addPanel.title')}
          onAdded={() => undefined}
          onAddItem={async (item) => {
            await addMutation.mutateAsync({
              tmdbId: item.id,
              mediaType: item.mediaType,
              title: item.title,
              year: item.year,
              posterPath: item.posterPath,
              voteAverage: item.voteAverage,
              runtimeMinutes: item.runtimeMinutes,
            });
          }}
          isItemAlreadyAdded={(item) => inWatchlistKeys.has(itemKey(item.id, item.mediaType))}
          alreadyAddedLabel={t('watchlist.search.alreadyAdded')}
          alreadyAddedHint={t('watchlist.search.alreadyAdded')}
          addErrorLabel={t('watchlist.addError')}
          searchPlaceholder={t('watchlist.search.placeholder')}
          searchAriaLabel={t('watchlist.search.label')}
          searchWrapClassName={styles.searchFixedWidth}
          showWatchProviders={false}
        />
      </div>

      <section className="section">
        <h2 className="visually-hidden">{t('watchlist.listAria')}</h2>

        {removeError ? (
          <p className="error" role="alert">
            {removeError}
          </p>
        ) : null}

        {isLoading && (
          <WatchlistSkeleton label={t('watchlist.loadingDetail')} gridClassName={styles.grid} />
        )}
        {!isLoading && isError && (
          <p className="error" role="alert">
            {t('watchlist.loadError')}
          </p>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <EmptyState
            icon={<Bookmark aria-hidden size={28} />}
            title={t('watchlist.empty.title')}
            message={t('watchlist.empty.message')}
          />
        )}
        {!isLoading && !isError && items.length > 0 && (
          <FilteredCollectionLayout
            toolbar={
              <WatchlistToolbar
                {...toCollectionToolbarProps(toolbar, {
                  filtersPanelId,
                  activeFilterCount,
                  isMobile,
                })}
                trailing={<ViewModeToggle value={viewMode} onChange={changeViewMode} />}
              />
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
            <ul
              className={viewMode === 'list' ? styles.rows : styles.grid}
              aria-label={t('watchlist.listAria')}
            >
              {toolbar.visibleItems.map((item) => (
                <WatchlistMovieCard
                  key={itemKey(item.tmdbId, item.mediaType)}
                  item={item}
                  hasHover={hasHover}
                  ratingScale={user?.ratingScale}
                  t={t}
                  onRemove={() => handleRemove(item.tmdbId, item.mediaType)}
                  onOpenDetails={() => setDetailsTarget(item)}
                  onProposeFallback={() => setProposeTarget(item)}
                  layout={viewMode === 'list' ? 'row' : 'grid'}
                />
              ))}
            </ul>
          </FilteredCollectionLayout>
        )}
      </section>

      {proposeTarget && (
        <ProposeToEventModal
          open={!!proposeTarget}
          movie={proposeTarget}
          onClose={() => setProposeTarget(null)}
        />
      )}

      {detailsTarget && (
        <MovieDetailsModal
          open={!!detailsTarget}
          title={detailsTarget.title}
          year={detailsTarget.year}
          tmdbId={detailsTarget.tmdbId}
          mediaType={detailsTarget.mediaType}
          posterSrc={posterImageSrc(detailsTarget.posterPath)}
          voteLabel={formatTmdbVote(detailsTarget.voteAverage, user?.ratingScale)}
          runtimeLabel={formatRuntimeMinutes(detailsTarget.runtimeMinutes)}
          onClose={() => setDetailsTarget(null)}
        />
      )}

      {letterboxdModalOpen && (
        <LetterboxdConnectModal open onClose={() => setLetterboxdModalOpen(false)} />
      )}
    </PageLayout>
  );
}

import { useId, useMemo, useRef, useState } from 'react';
import { Bookmark, Import, Plus, Search } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import EmptyState from '@/shared/components/EmptyState';
import Sheet from '@/shared/components/Sheet';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import AddMoviePanel from '@/features/movies/components/AddMoviePanel';
import MovieDetailsModal from '@/features/movies/components/MovieDetailsModal';
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
import WatchlistFiltersPanel from '@/features/watchlist/components/WatchlistFiltersPanel';
import WatchlistMovieCard from '@/features/watchlist/components/WatchlistMovieCard';
import WatchlistSkeleton from '@/features/watchlist/components/WatchlistSkeleton';
import ProposeToEventModal from '@/features/watchlist/components/ProposeToEventModal';
import styles from './WatchlistPage.module.css';

function itemKey(tmdbId: number, mediaType: MovieMediaType | undefined): string {
  return `${tmdbId}|${mediaType ?? 'movie'}`;
}

export default function WatchlistPage() {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user } = useAuth();
  useDocumentTitle(pageTitle(t('watchlist.title')));
  const hasHover = useHasHoverCapability();
  const isMobile = useIsMobile();
  const filtersPanelId = useId();

  const { data: items = [], isLoading, isError } = useWatchlist();

  const [removeError, setRemoveError] = useState<string | null>(null);
  const [proposeTarget, setProposeTarget] = useState<WatchlistItem | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<WatchlistItem | null>(null);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [letterboxdModalOpen, setLetterboxdModalOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const mediaTypeLabels = useMemo(
    () => ({
      movie: t('watchlist.toolbar.filterTypeMovie'),
      tv: t('watchlist.toolbar.filterTypeTv'),
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
  const subtitle =
    items.length === 1
      ? t('watchlist.header.subtitleOne', { count: 1 })
      : t('watchlist.header.subtitle', { count: items.length });
  const openAddPanel = () => setAddPanelOpen(true);

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
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setLetterboxdModalOpen(true)}
                >
                  <Import size={14} aria-hidden />
                  <span>{t('watchlist.letterboxdCtaShort')}</span>
                </button>
              )}
              <button
                type="button"
                ref={addButtonRef}
                className="btn btn-primary btn-sm"
                onClick={openAddPanel}
              >
                <Plus size={15} aria-hidden />
                <span>{t('watchlist.addPanel.triggerShort')}</span>
              </button>
            </div>
          ) : (
            <div className={styles.headerActions}>
              {!user?.letterboxdUsername && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setLetterboxdModalOpen(true)}
                >
                  <Import size={15} aria-hidden />
                  <span>{t('watchlist.letterboxdCta')}</span>
                </button>
              )}
              <button
                type="button"
                ref={addButtonRef}
                className="btn btn-primary"
                onClick={openAddPanel}
              >
                <Plus size={16} aria-hidden />
                <span>{t('watchlist.addPanel.trigger')}</span>
              </button>
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
        {removeError ? (
          <p className="error" role="alert">
            {removeError}
          </p>
        ) : null}

        {isLoading ? (
          <WatchlistSkeleton label={t('watchlist.loadingDetail')} gridClassName={styles.grid} />
        ) : isError ? (
          <p className="error" role="alert">
            {t('watchlist.loadError')}
          </p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bookmark aria-hidden size={28} />}
            title={t('watchlist.empty.title')}
            message={t('watchlist.empty.message')}
          />
        ) : (
          <>
            <div className={styles.toolbarBlock}>
              <WatchlistToolbar
                search={toolbar.search}
                onSearchChange={toolbar.setSearch}
                filtersOpen={toolbar.filtersOpen}
                onToggleFilters={() => toolbar.setFiltersOpen((v) => !v)}
                filtersPanelId={filtersPanelId}
                activeFilterCount={activeFilterCount}
                sortBy={toolbar.sortBy}
                sortDir={toolbar.sortDir}
                onSetSort={toolbar.setSortBy}
                isFiltered={toolbar.isFiltered}
                visibleCount={toolbar.visibleCount}
                totalCount={toolbar.totalCount}
                onClearAll={toolbar.resetAll}
                isMobile={isMobile}
              />

              {toolbar.filtersOpen && !isMobile && (
                <WatchlistFiltersPanel
                  panelId={filtersPanelId}
                  boxed
                  tmdbLanguage={tmdbLanguage}
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
                  onReset={toolbar.clearAllFilters}
                />
              )}

              {activeFilterCount > 0 && (
                <div
                  className={styles.activeFiltersRow}
                  aria-label={t('watchlist.filter.toggleAria')}
                >
                  {toolbar.activeFilterChips.map((chip) => (
                    <span key={chip.key} className={styles.activeFilterChip}>
                      <span className={styles.activeFilterChipLabel}>{chip.label}</span>
                      <button
                        type="button"
                        className={styles.activeFilterChipRemove}
                        onClick={chip.onRemove}
                        aria-label={t('watchlist.toolbar.removeFilterAria')}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                          <path
                            d="M1 1l8 8M9 1 1 9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            fill="none"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {isMobile && (
              <Sheet
                open={toolbar.filtersOpen}
                title={t('watchlist.toolbar.filtersSheetTitle')}
                onClose={() => toolbar.setFiltersOpen(false)}
                footer={
                  <>
                    <button
                      type="button"
                      className={styles.sheetReset}
                      onClick={toolbar.clearAllFilters}
                    >
                      {t('watchlist.toolbar.filtersReset')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => toolbar.setFiltersOpen(false)}
                    >
                      {t('watchlist.toolbar.filtersApply', { count: toolbar.visibleCount })}
                    </button>
                  </>
                }
              >
                <WatchlistFiltersPanel
                  tmdbLanguage={tmdbLanguage}
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
                />
              </Sheet>
            )}

            {toolbar.visibleItems.length === 0 ? (
              <EmptyState
                compact
                icon={<Search aria-hidden size={22} />}
                title={t('watchlist.toolbar.emptyTitle')}
                message={t('watchlist.toolbar.emptyMessage')}
                actions={
                  <button type="button" className="btn btn-sm" onClick={toolbar.resetAll}>
                    {t('watchlist.toolbar.filtersResetAll')}
                  </button>
                }
              />
            ) : (
              <ul className={styles.grid} aria-label={t('watchlist.listAria')}>
                {toolbar.visibleItems.map((item) => (
                  <WatchlistMovieCard
                    key={itemKey(item.tmdbId, item.mediaType)}
                    item={item}
                    hasHover={hasHover}
                    tmdbLanguage={tmdbLanguage}
                    ratingScale={user?.ratingScale}
                    t={t}
                    onRemove={() => handleRemove(item.tmdbId, item.mediaType)}
                    onOpenDetails={() => setDetailsTarget(item)}
                    onProposeFallback={() => setProposeTarget(item)}
                  />
                ))}
              </ul>
            )}
          </>
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
          movieTitle={detailsTarget.title}
          tmdbId={detailsTarget.tmdbId}
          mediaType={detailsTarget.mediaType}
          onClose={() => setDetailsTarget(null)}
        />
      )}

      {letterboxdModalOpen && (
        <LetterboxdConnectModal open onClose={() => setLetterboxdModalOpen(false)} />
      )}
    </PageLayout>
  );
}

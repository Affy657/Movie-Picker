import { useId, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { Bookmark, ChevronDown, Import } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import PageLayout from '@/shared/components/PageLayout';
import EmptyState from '@/shared/components/EmptyState';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import AddMovieForm from '@/features/movies/components/AddMovieForm';
import MovieDetailsModal from '@/features/movies/components/MovieDetailsModal';
import MovieSearchFiltersPanel from '@/features/movies/components/MovieSearchFiltersPanel';
import { useMovieSearchFilters } from '@/features/movies/hooks/useMovieSearchFilters';
import { CardKebab } from '@/features/movies/components/movieCardParts';
import type { MovieSearchFilters } from '@/features/movies/api/moviesApi';
import type { MovieMediaType } from '@/shared/types/movie';
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from '@/features/watchlist/hooks/useWatchlist';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';
import ProposeToEventModal from '@/features/watchlist/components/ProposeToEventModal';
import WatchlistProposeSubmenu from '@/features/watchlist/components/WatchlistProposeSubmenu';
import movieCardStyles from '@/features/movies/components/movieCardParts.module.css';
import addMovieFormStyles from '@/features/movies/components/AddMovieForm.module.css';
import sortStyles from '@/features/events/pages/event-detail/EventMoviesSection.module.css';
import styles from './WatchlistPage.module.css';

function itemKey(tmdbId: number, mediaType: MovieMediaType | undefined): string {
  return `${tmdbId}|${mediaType ?? 'movie'}`;
}

type SortKey = 'createdAt' | 'voteAverage' | 'duration';

function sortItems(items: WatchlistItem[], sortBy: SortKey): WatchlistItem[] {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'voteAverage': {
        const va = a.voteAverage ?? -Infinity;
        const vb = b.voteAverage ?? -Infinity;
        return vb - va;
      }
      case 'duration': {
        const ra = a.runtimeMinutes ?? Infinity;
        const rb = b.runtimeMinutes ?? Infinity;
        return ra - rb;
      }
      case 'createdAt':
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
}

function itemMatchesFilters(item: WatchlistItem, f: MovieSearchFilters): boolean {
  const year = Number.parseInt(item.year, 10);
  if (f.yearFrom != null && (Number.isNaN(year) || year < f.yearFrom)) return false;
  if (f.yearTo != null && (Number.isNaN(year) || year > f.yearTo)) return false;
  if (f.voteMin != null && (item.voteAverage ?? -Infinity) < f.voteMin) return false;
  if (f.runtimeMin != null && (item.runtimeMinutes ?? -Infinity) < f.runtimeMin) return false;
  if (f.runtimeMax != null && (item.runtimeMinutes ?? Infinity) > f.runtimeMax) return false;
  return true;
}

export default function WatchlistPage() {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user } = useAuth();
  useDocumentTitle(pageTitle(t('watchlist.title')));
  const hasHover = useHasHoverCapability();
  const filtersPanelId = useId();

  const { data: items = [], isLoading, isError } = useWatchlist();

  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [proposeTarget, setProposeTarget] = useState<WatchlistItem | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<WatchlistItem | null>(null);

  const filters = useMovieSearchFilters(tmdbLanguage, user?.ratingScale);

  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist({
    onError: (err) => setRemoveError(getErrorMessage(err, t('watchlist.removeError'))),
  });

  const inWatchlistKeys = useMemo(
    () => new Set(items.map((i) => itemKey(i.tmdbId, i.mediaType))),
    [items]
  );

  const filteredItems = useMemo(
    () => items.filter((i) => itemMatchesFilters(i, filters.activeFilters)),
    [items, filters.activeFilters]
  );

  const sortedItems = useMemo(() => sortItems(filteredItems, sortBy), [filteredItems, sortBy]);

  const handleRemove = (tmdbId: number, mediaType: MovieMediaType) => {
    setRemoveError(null);
    removeMutation.mutate({ tmdbId, mediaType });
  };

  return (
    <PageLayout className={styles.layout}>
      <section className="section">
        <AddMovieForm
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
        />
      </section>

      {!user?.letterboxdUsername && (
        <Link to={ROUTES.account} className={styles.letterboxdCta}>
          <Import size={14} aria-hidden />
          {t('watchlist.letterboxdCta')}
        </Link>
      )}

      <section className="section" aria-labelledby="watchlist-list-heading">
        <h2 id="watchlist-list-heading" className={styles.sectionTitle}>
          {t('watchlist.listHeading', { count: items.length })}
        </h2>

        {removeError ? (
          <p className="error" role="alert">
            {removeError}
          </p>
        ) : null}

        {isLoading ? (
          <p className="placeholder">{t('common.loading')}</p>
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
            <div className={addMovieFormStyles.searchRow}>
              <button
                type="button"
                className={clsx(
                  addMovieFormStyles.filterIconBtn,
                  filters.filtersOpen && addMovieFormStyles.filterIconBtnActive
                )}
                onClick={() => filters.setFiltersOpen((v) => !v)}
                aria-expanded={filters.filtersOpen}
                aria-controls={filtersPanelId}
                aria-label={t('watchlist.filter.toggleAria')}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M1.5 3.5h11M4 7h6M6.5 10.5h1" />
                </svg>
                {filters.activeFilterChips.length > 0 && (
                  <span className={addMovieFormStyles.filtersBadge} aria-hidden="true">
                    {filters.activeFilterChips.length}
                  </span>
                )}
              </button>
            </div>

            {filters.activeFilterChips.length > 0 && (
              <div
                className={addMovieFormStyles.activeFiltersRow}
                aria-label={t('watchlist.filter.toggleAria')}
              >
                {filters.activeFilterChips.map((chip) => (
                  <span key={chip.key} className={addMovieFormStyles.activeFilterChip}>
                    {chip.label}
                    <button
                      type="button"
                      className={addMovieFormStyles.activeFilterChipRemove}
                      onClick={chip.onRemove}
                      aria-label={t('movies.search.removeFilterAria')}
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
                <button
                  type="button"
                  className={addMovieFormStyles.filtersClearAll}
                  onClick={filters.clearAllFilters}
                >
                  {t('movies.search.filtersClearAll')}
                </button>
              </div>
            )}

            {filters.filtersOpen && (
              <MovieSearchFiltersPanel
                panelId={filtersPanelId}
                tmdbLanguage={tmdbLanguage}
                selectedGenres={filters.selectedGenres}
                selectedDecade={filters.selectedDecade}
                voteMin={filters.voteMin}
                selectedLanguage={filters.selectedLanguage}
                availabilityFilter={filters.availabilityFilter}
                runtimeRange={filters.runtimeRange}
                ratingScale={user?.ratingScale}
                onToggleDecade={filters.toggleDecade}
                onToggleVoteMin={filters.toggleVoteMin}
                onChangeRuntimeRange={filters.changeRuntimeRange}
              />
            )}

            {filteredItems.length > 1 && (
              <div className={sortStyles.sortBar}>
                <span className={sortStyles.sortLabel}>{t('movies.list.sortLabel')}</span>
                <div
                  className={sortStyles.sortPills}
                  role="toolbar"
                  aria-label={t('movies.list.sortLabel')}
                >
                  {(
                    [
                      { key: 'createdAt', label: t('movies.list.sortAddedAt') },
                      { key: 'voteAverage', label: t('movies.list.sortTmdbVote') },
                      { key: 'duration', label: t('movies.list.sortDuration') },
                    ] as { key: SortKey; label: string }[]
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={clsx(
                        sortStyles.sortPill,
                        sortBy === key && sortStyles.sortPillActive
                      )}
                      aria-pressed={sortBy === key}
                      onClick={() => setSortBy(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {sortedItems.length === 0 ? (
              <p className="placeholder">{t('watchlist.filter.empty')}</p>
            ) : (
              <ul className={styles.grid} aria-label={t('watchlist.listAria')}>
                {sortedItems.map((item) => {
                  const posterRaw = posterImageSrc(item.posterPath);
                  const posterSrc = posterRaw ? tmdbPosterSrcForListDisplay(posterRaw) : undefined;
                  const voteLabel = formatTmdbVote(item.voteAverage, user?.ratingScale);
                  const runtimeLabel = formatRuntimeMinutes(item.runtimeMinutes);
                  return (
                    <li key={itemKey(item.tmdbId, item.mediaType)} className={styles.card}>
                      <div className={styles.poster}>
                        {posterSrc ? (
                          <img src={posterSrc} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <div className={styles.posterPlaceholder}>
                            {t('movies.search.posterPlaceholder')}
                          </div>
                        )}
                        {hasHover && (
                          <div className={styles.proposeSlot}>
                            <WatchlistProposeSubmenu movie={item} onDone={() => undefined} />
                          </div>
                        )}
                        <div className={styles.kebabSlot}>
                          <CardKebab
                            title={item.title}
                            year={item.year}
                            tmdbId={item.tmdbId}
                            mediaType={item.mediaType}
                            isMine
                            isHost={false}
                            canRemove
                            onRemove={() => handleRemove(item.tmdbId, item.mediaType)}
                            onProposeToEvent={!hasHover ? () => setProposeTarget(item) : undefined}
                            t={t}
                          />
                        </div>
                      </div>
                      <div className={styles.cardBody}>
                        <span className={styles.cardTitle}>
                          {item.title}
                          {item.mediaType === 'tv' ? (
                            <span className={styles.mediaBadge}>{t('movies.list.tvBadge')}</span>
                          ) : null}
                        </span>
                        <span className={styles.cardMetaRow}>
                          {item.year ? <span>{item.year}</span> : null}
                          {voteLabel ? (
                            <span className="tmdb-vote">
                              {item.year ? ' · ' : null}
                              {voteLabel}
                            </span>
                          ) : null}
                          {runtimeLabel ? (
                            <span>
                              {item.year || voteLabel ? ' · ' : null}
                              {runtimeLabel}
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          className={clsx(movieCardStyles.detailsToggle, styles.cardDetailsBtn)}
                          aria-haspopup="dialog"
                          onClick={() => setDetailsTarget(item)}
                        >
                          <span>{t('movies.details.toggleShow')}</span>
                          <ChevronDown aria-hidden size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
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
    </PageLayout>
  );
}

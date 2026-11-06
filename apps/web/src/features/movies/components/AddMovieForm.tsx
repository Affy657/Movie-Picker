import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Film, ListFilter, Search } from 'lucide-react';
import { addMovieToEvent, type MovieSearchItem } from '@/features/movies/api/moviesApi';
import { othersAlreadySeenHint } from '@/features/movies/utils/seenHint';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { metaGenresLabel, movieMetaLine } from '@/shared/utils/movieMetaLine';
import type { MovieData } from '@/shared/types/movie';
import { safeTmdbWatchUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import TmdbAttribution from '@/features/movies/components/TmdbAttribution';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useSearchHistory } from '@/features/movies/hooks/useSearchHistory';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { SEARCH_MIN_CHARS, useMovieSearch } from '@/features/movies/hooks/useMovieSearch';
import { useMovieSearchFilters } from '@/features/movies/hooks/useMovieSearchFilters';
import MovieSearchFiltersPanel from '@/features/movies/components/MovieSearchFiltersPanel';
import ActiveFilterChips from '@/features/movies/components/ActiveFilterChips';
import Chip from '@/shared/components/Chip';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import SearchHistoryDropdown, { HISTORY_ITEM_SELECTOR } from './SearchHistoryDropdown';
import styles from './AddMovieForm.module.css';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import CountBadge from '@/shared/components/CountBadge';
import { PaidOfferChip } from '@/features/movies/components/movieCardParts';

function isSameTmdbItem(m: MovieData, r: MovieSearchItem): boolean {
  return m.tmdbId === r.id && (m.mediaType ?? 'movie') === (r.mediaType ?? 'movie');
}

function searchFailureMessage(failure: unknown, t: Translate): string | null {
  return failure ? getErrorMessage(failure, t('movies.search.fallbackError')) : null;
}

function searchStatusLabel(
  search: { searching: boolean; answered: boolean; count: number },
  t: Translate
): string {
  if (search.searching) return t('movies.search.a11ySearching');
  if (!search.answered) return '';
  if (search.count === 0) return t('movies.search.a11yNoResults');
  return t('movies.search.a11yResultsCount', { count: search.count });
}

export interface AddMovieFormProps {
  slug?: string;
  participantId?: string;
  participantPseudo?: string;
  existingMovies?: MovieData[];
  onAdded: () => void;
  disabled?: boolean;
  onAddItem?: (item: MovieSearchItem) => Promise<void>;
  isItemAlreadyAdded?: (item: MovieSearchItem) => boolean;
  alreadyAddedLabel?: string;
  alreadyAddedHint?: string;
  addErrorLabel?: string;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  searchWrapClassName?: string;
  showWatchProviders?: boolean;
  includeSeries?: boolean;
}

export default function AddMovieForm({
  slug,
  participantId,
  participantPseudo,
  existingMovies = [],
  onAdded,
  disabled,
  onAddItem,
  isItemAlreadyAdded,
  alreadyAddedLabel,
  alreadyAddedHint,
  addErrorLabel,
  searchPlaceholder,
  searchAriaLabel,
  searchWrapClassName,
  showWatchProviders = true,
  includeSeries = false,
}: Readonly<AddMovieFormProps>) {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory(user?.userId);
  const minCharsHintId = useId();
  const filtersPanelId = useId();

  const [query, setQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [historyDismissed, setHistoryDismissed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const filters = useMovieSearchFilters(tmdbLanguage, user?.ratingScale);

  const trimmedForSearch = useMemo(() => query.trim(), [query]);

  const immediateSearchRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filtersPanelRef = useRef<HTMLDivElement | null>(null);

  const closeFilters = useCallback(() => filters.setFiltersOpen(false), [filters]);
  useClickOutside(filtersPanelRef, closeFilters, filters.filtersOpen, {
    ignoreSelector: '[data-filters-toggle]',
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const filterChangedRef = filters.filterChangedRef;
  const takeImmediateSearch = useCallback(() => {
    const immediate = immediateSearchRef.current || filterChangedRef.current;
    immediateSearchRef.current = false;
    filterChangedRef.current = false;
    return immediate;
  }, [filterChangedRef]);

  const {
    searchKey,
    results,
    meta: searchMeta,
    searching,
    answered,
    failure,
    emptySearchKey,
    searchNow,
    reset: resetSearch,
  } = useMovieSearch({
    term: trimmedForSearch,
    filters: filters.activeFilters,
    hasApiFilters: filters.hasApiFilters,
    lang: tmdbLanguage,
    eventSlug: slug,
    includeSeries,
    takeImmediate: takeImmediateSearch,
    onSearched: addToHistory,
  });

  useEffect(() => setAddError(null), [searchKey]);

  const error = addError ?? searchFailureMessage(failure, t);
  const a11ySearchStatus = searchStatusLabel({ searching, answered, count: results.length }, t);

  const searchAllowed = trimmedForSearch.length >= SEARCH_MIN_CHARS || filters.hasApiFilters;

  const search = useCallback(() => {
    if (!searchAllowed) return;
    setAddError(null);
    searchNow();
  }, [searchAllowed, searchNow]);

  const selectHistoryItem = useCallback((q: string) => {
    immediateSearchRef.current = true;
    setHistoryDismissed(true);
    setQuery(q);
  }, []);

  const dismissHistory = useCallback(() => setHistoryDismissed(true), []);

  const historyAvailable = !trimmedForSearch && history.length > 0;
  const showHistory = inputFocused && !historyDismissed && historyAvailable;
  const pendingHistoryFocusRef = useRef<'first' | 'last' | null>(null);

  const focusHistoryEntry = (position: 'first' | 'last') => {
    const items = containerRef.current?.querySelectorAll<HTMLElement>(HISTORY_ITEM_SELECTOR);
    if (!items?.length) return;
    items[position === 'first' ? 0 : items.length - 1]?.focus();
  };

  const focusHistoryItem = (position: 'first' | 'last') => {
    if (showHistory) {
      focusHistoryEntry(position);
      return;
    }
    pendingHistoryFocusRef.current = position;
    setHistoryDismissed(false);
  };

  useEffect(() => {
    const position = pendingHistoryFocusRef.current;
    if (!position || !showHistory) return;
    pendingHistoryFocusRef.current = null;
    focusHistoryEntry(position);
  });

  const displayedResults = useMemo(
    () =>
      filters.availabilityFilter
        ? results.filter((r) =>
            r.watchProviders?.some((p) => p.type === filters.availabilityFilter)
          )
        : results,
    [results, filters.availabilityFilter]
  );

  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;
    const onFocusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) {
        setInputFocused(false);
        setHistoryDismissed(false);
      }
    };
    el.addEventListener('focusout', onFocusOut);
    return () => el.removeEventListener('focusout', onFocusOut);
  }, [disabled]);

  const addMovie = async (r: MovieSearchItem) => {
    setAddError(null);
    setAdding(true);
    try {
      if (onAddItem) {
        await onAddItem(r);
      } else if (slug && participantId) {
        await addMovieToEvent(slug, {
          tmdbId: r.id,
          mediaType: r.mediaType,
          title: r.title,
          year: r.year,
          posterPath: r.posterPath,
          participantId,
          genreIds: r.genreIds,
        });
        track('movie_added', { mediaType: r.mediaType });
      }
      resetSearch();
      setQuery('');
      onAdded();
      setHistoryDismissed(true);
      searchInputRef.current?.focus();
    } catch (err) {
      setAddError(getErrorMessage(err, addErrorLabel ?? t('movies.search.addError')));
    } finally {
      setAdding(false);
    }
  };

  if (disabled) return null;

  const trimmed = trimmedForSearch;
  const showMinCharsHint = trimmed.length > 0 && trimmed.length < SEARCH_MIN_CHARS;
  const showNoResultsBlock =
    !searching && searchAllowed && results.length === 0 && !error && emptySearchKey === searchKey;
  const showAvailabilityEmpty =
    !searching &&
    results.length > 0 &&
    displayedResults.length === 0 &&
    filters.availabilityFilter != null;

  const hasResultsBlock = displayedResults.length > 0;
  const activeFiltersCount = filters.activeFilterChips.length;

  return (
    <div className={styles.root}>
      <div className={clsx(styles.searchWrap, searchWrapClassName)} ref={containerRef}>
        <div className={styles.searchRow}>
          <div className={styles.inputWrap}>
            <button
              type="button"
              className={styles.searchIconBtn}
              onClick={search}
              disabled={searching || !searchAllowed}
              aria-label={t('movies.search.searchButton')}
            >
              <Search size={ICON_SIZE.md} aria-hidden />
            </button>
            <input
              ref={searchInputRef}
              id="add-movie-search"
              type="search"
              enterKeyHint="search"
              autoCorrect="off"
              className="input"
              aria-label={searchAriaLabel ?? t('movies.search.label')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHistoryDismissed(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  search();
                } else if (e.key === 'Escape' && showHistory) {
                  e.preventDefault();
                  e.stopPropagation();
                  dismissHistory();
                } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && historyAvailable) {
                  e.preventDefault();
                  focusHistoryItem(e.key === 'ArrowDown' ? 'first' : 'last');
                }
              }}
              onFocus={() => {
                setInputFocused(true);
              }}
              placeholder={searchPlaceholder ?? t('movies.search.placeholder')}
              autoComplete="off"
              aria-busy={searching}
              aria-describedby={showMinCharsHint ? minCharsHintId : undefined}
            />
          </div>
          <Button
            variant={filters.filtersOpen ? 'soft' : 'secondary'}
            className={clsx(styles.filterIconBtn, styles.filterIconBtnLabeled)}
            onClick={() => filters.setFiltersOpen((v) => !v)}
            aria-expanded={filters.filtersOpen}
            aria-controls={filtersPanelId}
            data-filters-toggle
          >
            <ListFilter size={ICON_SIZE.sm} aria-hidden />
            <span className={styles.filterIconBtnLabel}>{t('movies.search.filtersToggle')}</span>
            {activeFiltersCount > 0 && (
              <CountBadge value={activeFiltersCount} size="sm" aria-hidden="true" />
            )}
          </Button>
        </div>

        {showHistory && (
          <SearchHistoryDropdown
            history={history}
            inputRef={searchInputRef}
            onSelect={selectHistoryItem}
            onRemove={removeFromHistory}
            onClear={clearHistory}
            onClose={dismissHistory}
          />
        )}
      </div>

      <ActiveFilterChips
        chips={filters.activeFilterChips}
        groupAriaLabel={t('movies.search.filtersToggle')}
        removeAriaLabel={t('movies.search.removeFilterAria')}
        clearAllLabel={t('movies.search.filtersClearAll')}
        onClearAll={filters.clearAllFilters}
      />

      {filters.filtersOpen && (
        <div ref={filtersPanelRef}>
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
            onToggleGenre={filters.toggleGenre}
            onToggleDecade={filters.toggleDecade}
            onToggleVoteMin={filters.toggleVoteMin}
            onToggleLanguage={filters.toggleLanguage}
            onToggleAvailability={filters.toggleAvailability}
            onChangeRuntimeRange={filters.changeRuntimeRange}
          />
        </div>
      )}

      {showMinCharsHint ? (
        <p id={minCharsHintId} className={styles.minCharsHint}>
          {t('movies.search.liveSearchMinCharsHint', { min: SEARCH_MIN_CHARS })}
        </p>
      ) : null}
      <p role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {a11ySearchStatus}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {showNoResultsBlock ? (
        <p className={styles.noResultsHint}>
          {trimmed.length >= SEARCH_MIN_CHARS
            ? t('movies.search.noResultsForQuery', { query: trimmed })
            : t('movies.search.noResultsForFilters')}
        </p>
      ) : null}
      {showAvailabilityEmpty ? (
        <p className={styles.noResultsHint}>{t('movies.search.noResultsAvailability')}</p>
      ) : null}
      {hasResultsBlock && (
        <>
          {showWatchProviders && searchMeta?.watchProvidersRegion ? (
            <p className={styles.regionHint}>
              {t('movies.search.regionHint', { region: searchMeta.watchProvidersRegion })}
            </p>
          ) : null}
          <ul className={styles.results} aria-label={t('movies.search.resultsListAria')}>
            {displayedResults.map((r) => {
              const runtimeLabel = formatRuntimeMinutes(r.runtimeMinutes);
              const genresLabel = metaGenresLabel(r.genreIds, tmdbLanguage);
              const metaLine = movieMetaLine(r.year, genresLabel, runtimeLabel);
              const allProviders = r.watchProviders ?? [];
              const providers = allProviders.filter((p) => p.type === 'flatrate');
              const rentCount = allProviders.filter((p) => p.type === 'rent').length;
              const buyCount = allProviders.filter((p) => p.type === 'buy').length;
              const posterSrcRaw = posterImageSrc(r.posterPath);
              const posterSrc = posterSrcRaw
                ? tmdbPosterSrcForListDisplay(posterSrcRaw)
                : undefined;
              const alreadyListed = existingMovies.find((m) => isSameTmdbItem(m, r));
              const alreadyAdded = isItemAlreadyAdded ? isItemAlreadyAdded(r) : !!alreadyListed;
              const seenHint = alreadyListed
                ? othersAlreadySeenHint(alreadyListed.seenByPseudos, participantPseudo, t)
                : null;
              const safeWatchUrl = safeTmdbWatchUrl(r.tmdbWatchPageUrl);
              return (
                <li key={`${r.mediaType ?? 'movie'}-${r.id}`} className={styles.resultItem}>
                  <div className={styles.posterWrap}>
                    {posterSrc ? (
                      <img src={posterSrc} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <div className={styles.posterPlaceholder} aria-hidden>
                        <Film size={ICON_SIZE.xl} />
                      </div>
                    )}
                  </div>
                  <div className={styles.resultBody}>
                    <div className={styles.resultTextCol}>
                      <span className={styles.resultTitle}>
                        {r.title}
                        {r.mediaType === 'tv' && (
                          <Chip tone="primary" size="sm" className={styles.mediaTypeBadge}>
                            {t('movies.list.tvBadge')}
                          </Chip>
                        )}
                      </span>
                      {metaLine ? <span className={styles.resultMeta}>{metaLine}</span> : null}
                    </div>
                    {alreadyListed ? (
                      <p className={`${styles.resultDuplicate} hint`}>
                        {t('movies.search.duplicateHint')}
                        {seenHint ? <> {seenHint}</> : null}
                      </p>
                    ) : null}
                    {showWatchProviders &&
                      (providers.length > 0 || rentCount > 0 || buyCount > 0) && (
                        <div className={styles.providersRow}>
                          <WatchProviderChips
                            providers={providers}
                            variant="compact"
                            watchPageUrl={safeWatchUrl}
                          />
                          {rentCount > 0 && (
                            <PaidOfferChip
                              type="rent"
                              count={rentCount}
                              ariaLabel={t('movies.watchProviders.alsoRentAria', {
                                count: rentCount,
                                title: r.title,
                              })}
                              href={safeWatchUrl ?? undefined}
                            />
                          )}
                          {buyCount > 0 && (
                            <PaidOfferChip
                              type="buy"
                              count={buyCount}
                              ariaLabel={t('movies.watchProviders.alsoBuyAria', {
                                count: buyCount,
                                title: r.title,
                              })}
                              href={safeWatchUrl ?? undefined}
                            />
                          )}
                        </div>
                      )}
                  </div>
                  <div className={styles.resultAction}>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className={styles.addButton}
                      onClick={() => addMovie(r)}
                      disabled={adding || alreadyAdded}
                      aria-label={
                        alreadyAdded
                          ? undefined
                          : t('movies.search.addButtonAria', { title: r.title })
                      }
                      title={
                        alreadyAdded
                          ? (alreadyAddedHint ?? t('movies.search.alreadyListedHint'))
                          : undefined
                      }
                    >
                      {alreadyAdded
                        ? (alreadyAddedLabel ?? t('movies.search.alreadyListed'))
                        : t('movies.search.addButton')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <TmdbAttribution />
        </>
      )}
    </div>
  );
}

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Film, ListFilter, Search } from 'lucide-react';
import {
  addMovieToEvent,
  searchMovies,
  type MovieSearchFilters,
  type MovieSearchItem,
  type MovieSearchListResponse,
} from '@/features/movies/api/moviesApi';
import { othersAlreadySeenHint } from '@/features/movies/utils/seenHint';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation } from '@/shared/i18n';
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

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_MIN_CHARS = 2;

function makeSearchKey(term: string, filters: MovieSearchFilters): string {
  return `${term}|${(filters.genreIds ?? []).join(',')}|${filters.yearFrom ?? ''}|${filters.yearTo ?? ''}|${filters.voteMin ?? ''}|${filters.originalLanguage ?? ''}|${filters.runtimeMin ?? ''}|${filters.runtimeMax ?? ''}`;
}

function isSameTmdbItem(m: MovieData, r: MovieSearchItem): boolean {
  return m.tmdbId === r.id && (m.mediaType ?? 'movie') === (r.mediaType ?? 'movie');
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
  const [results, setResults] = useState<MovieSearchItem[]>([]);
  const [searchMeta, setSearchMeta] = useState<Pick<
    MovieSearchListResponse,
    'disclaimer' | 'watchProvidersRegion' | 'tmdbAttributionUrl'
  > | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptySearchKey, setEmptySearchKey] = useState<string | null>(null);

  const filters = useMovieSearchFilters(tmdbLanguage, user?.ratingScale);

  const trimmedForSearch = useMemo(() => query.trim(), [query]);

  const lastFulfilledKeyRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const immediateSearchRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filtersPanelRef = useRef<HTMLDivElement | null>(null);

  const closeFilters = useCallback(() => filters.setFiltersOpen(false), [filters]);
  useClickOutside(filtersPanelRef, closeFilters, filters.filtersOpen, {
    ignoreSelector: '[data-filters-toggle]',
  });

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const clearSearchResults = useCallback(() => {
    lastFulfilledKeyRef.current = null;
    setResults([]);
    setSearchMeta(null);
    setError(null);
    setEmptySearchKey(null);
    setA11ySearchStatus('');
    abortRef.current?.abort();
    setSearching(false);
  }, []);

  const [a11ySearchStatus, setA11ySearchStatus] = useState('');

  const executeSearch = useCallback(
    async (term: string, activeFilters: MovieSearchFilters) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setSearching(true);
      setA11ySearchStatus(t('movies.search.a11ySearching'));
      try {
        const body = await searchMovies(term, {
          signal: controller.signal,
          lang: tmdbLanguage,
          eventSlug: slug,
          filters: activeFilters,
        });
        if (controller.signal.aborted) return;
        setResults(body.items);
        const hasMeta =
          Boolean(body.disclaimer) ||
          Boolean(body.watchProvidersRegion) ||
          Boolean(body.tmdbAttributionUrl);
        setSearchMeta(
          hasMeta
            ? {
                disclaimer: body.disclaimer,
                watchProvidersRegion: body.watchProvidersRegion,
                tmdbAttributionUrl: body.tmdbAttributionUrl,
              }
            : null
        );
        lastFulfilledKeyRef.current = makeSearchKey(term, activeFilters);
        if (term.length >= SEARCH_MIN_CHARS) addToHistory(term);
        if (body.items.length === 0) {
          setEmptySearchKey(makeSearchKey(term, activeFilters));
          setA11ySearchStatus(t('movies.search.a11yNoResults'));
        } else {
          setEmptySearchKey(null);
          setA11ySearchStatus(t('movies.search.a11yResultsCount', { count: body.items.length }));
        }
      } catch (err) {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError'))
          return;
        lastFulfilledKeyRef.current = null;
        setEmptySearchKey(null);
        setA11ySearchStatus('');
        setError(getErrorMessage(err, t('movies.search.fallbackError')));
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    },
    [tmdbLanguage, t, slug, addToHistory]
  );

  const searchAllowed = trimmedForSearch.length >= SEARCH_MIN_CHARS || filters.hasApiFilters;
  const currentSearchKey = useMemo(
    () => makeSearchKey(trimmedForSearch, filters.activeFilters),
    [trimmedForSearch, filters.activeFilters]
  );

  const search = useCallback(() => {
    if (!searchAllowed) return;
    clearDebounceTimer();
    executeSearch(trimmedForSearch, filters.activeFilters);
  }, [searchAllowed, trimmedForSearch, filters.activeFilters, executeSearch, clearDebounceTimer]);

  useEffect(() => {
    const trimmed = trimmedForSearch;
    const shouldSearch = trimmed.length >= SEARCH_MIN_CHARS;

    if (!shouldSearch) {
      immediateSearchRef.current = false;
      filters.filterChangedRef.current = false;
      clearDebounceTimer();
      clearSearchResults();
      return;
    }

    abortRef.current?.abort();
    if (currentSearchKey !== lastFulfilledKeyRef.current) {
      setResults([]);
      setSearchMeta(null);
      setError(null);
      setEmptySearchKey(null);
      lastFulfilledKeyRef.current = null;
    }

    clearDebounceTimer();

    const immediate = immediateSearchRef.current || filters.filterChangedRef.current;
    immediateSearchRef.current = false;
    filters.filterChangedRef.current = false;

    if (immediate) {
      executeSearch(trimmed, filters.activeFilters);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      executeSearch(trimmed, filters.activeFilters);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearDebounceTimer();
    };
  }, [
    trimmedForSearch,
    filters.activeFilters,
    filters.filterChangedRef,
    currentSearchKey,
    executeSearch,
    clearDebounceTimer,
    clearSearchResults,
  ]);

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
      }
    };
    el.addEventListener('focusout', onFocusOut);
    return () => el.removeEventListener('focusout', onFocusOut);
  }, [disabled]);

  const addMovie = async (r: MovieSearchItem) => {
    setError(null);
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
      clearSearchResults();
      setQuery('');
      onAdded();
    } catch (err) {
      setError(getErrorMessage(err, addErrorLabel ?? t('movies.search.addError')));
    } finally {
      setAdding(false);
    }
  };

  if (disabled) return null;

  const trimmed = trimmedForSearch;
  const showMinCharsHint = trimmed.length > 0 && trimmed.length < SEARCH_MIN_CHARS;
  const showNoResultsBlock =
    !searching &&
    searchAllowed &&
    results.length === 0 &&
    !error &&
    emptySearchKey !== null &&
    emptySearchKey === currentSearchKey;
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
                setHistoryDismissed(false);
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
                <li key={r.id} className={styles.resultItem}>
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

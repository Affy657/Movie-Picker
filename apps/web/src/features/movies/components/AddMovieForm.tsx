import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ImageOff, Search } from 'lucide-react';
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
import type { TranslationKey } from '@/shared/i18n/t';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { genreLabel } from '@/features/profile/lib/tmdbGenres';
import type { MovieData } from '@/shared/types/movie';
import { safeTmdbWatchUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import WatchProviderChips, { ModeIcon } from '@/features/movies/components/WatchProviderChips';
import TmdbAttribution from '@/features/movies/components/TmdbAttribution';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useSearchHistory } from '@/features/movies/hooks/useSearchHistory';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useMovieSearchFilters } from '@/features/movies/hooks/useMovieSearchFilters';
import MovieSearchFiltersPanel from '@/features/movies/components/MovieSearchFiltersPanel';
import styles from './AddMovieForm.module.css';

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_MIN_CHARS = 2;

function makeSearchKey(term: string, filters: MovieSearchFilters): string {
  return `${term}|${(filters.genreIds ?? []).join(',')}|${filters.yearFrom ?? ''}|${filters.yearTo ?? ''}|${filters.voteMin ?? ''}|${filters.originalLanguage ?? ''}|${filters.runtimeMin ?? ''}|${filters.runtimeMax ?? ''}`;
}

function isSameTmdbItem(m: MovieData, r: MovieSearchItem): boolean {
  return m.tmdbId === r.id && (m.mediaType ?? 'movie') === (r.mediaType ?? 'movie');
}

const MAX_RESULT_GENRES = 2;

function resultGenresLabel(genreIds: number[] | undefined, locale: string): string | null {
  if (!genreIds?.length) return null;
  return genreIds
    .slice(0, MAX_RESULT_GENRES)
    .map((id) => genreLabel(id, locale))
    .join(', ');
}

function resultMetaLine(
  year: string | undefined,
  genresLabel: string | null,
  runtimeLabel: string | null
): string | null {
  const parts = [year, genresLabel, runtimeLabel].filter((part): part is string => !!part);
  return parts.length ? parts.join(', ') : null;
}

function PaidAvailabilityChip({
  type,
  count,
  title,
  watchPageUrl,
  t,
}: Readonly<{
  type: 'rent' | 'buy';
  count: number;
  title: string;
  watchPageUrl: string | null;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}>) {
  const ariaLabel = t(
    type === 'rent' ? 'movies.watchProviders.alsoRentAria' : 'movies.watchProviders.alsoBuyAria',
    { count, title }
  );
  const icon = <ModeIcon type={type} size={13} />;
  return watchPageUrl ? (
    <a
      href={watchPageUrl}
      className={styles.paidChip}
      aria-label={ariaLabel}
      target="_blank"
      rel="noreferrer noopener"
    >
      {icon}
      <span className={styles.paidChipCount}>{count}</span>
    </a>
  ) : (
    <span className={styles.paidChip} role="img" aria-label={ariaLabel}>
      {icon}
      <span className={styles.paidChipCount}>{count}</span>
    </span>
  );
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
  const historyDropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
    // Un changement de filtre ne doit jamais declencher de recherche automatique
    // tant que la barre est vide (ou trop courte) : les filtres seuls ne
    // suffisent pas a lancer une recherche implicite, seule une recherche
    // explicite (bouton / Entree, cf. searchAllowed) peut le faire.
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
    setInputFocused(false);
    setQuery(q);
  }, []);

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

  useEffect(() => {
    const dropdownVisible = inputFocused && !trimmedForSearch && history.length > 0;
    if (!dropdownVisible) return;
    const el = historyDropdownRef.current;
    if (!el) return;
    const onMouseDown = (e: MouseEvent) => e.preventDefault();
    el.addEventListener('mousedown', onMouseDown);
    return () => el.removeEventListener('mousedown', onMouseDown);
  }, [inputFocused, trimmedForSearch, history]);

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
  const showHistory = inputFocused && !trimmed && history.length > 0;
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
              <Search size={15} aria-hidden />
            </button>
            <input
              ref={searchInputRef}
              id="add-movie-search"
              type="search"
              className="input"
              aria-label={searchAriaLabel ?? t('movies.search.label')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  search();
                } else if (e.key === 'Escape') {
                  setInputFocused(false);
                }
              }}
              onFocus={() => setInputFocused(true)}
              placeholder={searchPlaceholder ?? t('movies.search.placeholder')}
              autoComplete="off"
              role="combobox"
              aria-expanded={showHistory}
              aria-controls="add-movie-history"
              aria-busy={searching}
              aria-describedby={showMinCharsHint ? minCharsHintId : undefined}
            />
            {showHistory && (
              <div
                className={styles.historyDropdown}
                id="add-movie-history"
                ref={historyDropdownRef}
              >
                <div className={styles.historyHeader}>
                  <span className={styles.historyTitle}>{t('movies.search.historyTitle')}</span>
                  <button type="button" className={styles.historyClearBtn} onClick={clearHistory}>
                    {t('movies.search.historyClear')}
                  </button>
                </div>
                <ul className={styles.historyList}>
                  {history.map((q) => (
                    <li key={q} className={styles.historyItem}>
                      <button
                        type="button"
                        className={styles.historyItemBtn}
                        aria-label={t('movies.search.historySelectAria', { query: q })}
                        onClick={() => selectHistoryItem(q)}
                      >
                        <svg
                          className={styles.historyIcon}
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <circle cx="6.5" cy="6.5" r="4.5" />
                          <path d="M10.5 10.5 14 14" strokeLinecap="round" />
                        </svg>
                        <span className={styles.historyLabel}>{q}</span>
                      </button>
                      <button
                        type="button"
                        className={styles.historyRemoveBtn}
                        aria-label={t('movies.search.historyRemoveAria', { query: q })}
                        onClick={() => removeFromHistory(q)}
                      >
                        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                          <path
                            d="M1 1l10 10M11 1 1 11"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            fill="none"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            type="button"
            className={clsx(
              styles.filterIconBtn,
              styles.filterIconBtnLabeled,
              filters.filtersOpen && styles.filterIconBtnActive
            )}
            onClick={() => filters.setFiltersOpen((v) => !v)}
            aria-expanded={filters.filtersOpen}
            aria-controls={filtersPanelId}
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
            <span className={styles.filterIconBtnLabel}>{t('movies.search.filtersToggle')}</span>
            {activeFiltersCount > 0 && (
              <span className={styles.filtersBadge} aria-hidden="true">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {filters.activeFilterChips.length > 0 && (
        <div className={styles.activeFiltersRow} aria-label={t('movies.search.filtersToggle')}>
          {filters.activeFilterChips.map((chip) => (
            <span key={chip.key} className={styles.activeFilterChip}>
              <span className={styles.activeFilterChipLabel}>{chip.label}</span>
              <button
                type="button"
                className={styles.activeFilterChipRemove}
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
            className={styles.filtersClearAll}
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
          onToggleGenre={filters.toggleGenre}
          onToggleDecade={filters.toggleDecade}
          onToggleVoteMin={filters.toggleVoteMin}
          onToggleLanguage={filters.toggleLanguage}
          onToggleAvailability={filters.toggleAvailability}
          onChangeRuntimeRange={filters.changeRuntimeRange}
        />
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
              const genresLabel = resultGenresLabel(r.genreIds, tmdbLanguage);
              const metaLine = resultMetaLine(r.year, genresLabel, runtimeLabel);
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
                        <ImageOff size={20} />
                      </div>
                    )}
                  </div>
                  <div className={styles.resultBody}>
                    <div className={styles.resultTextCol}>
                      <span className={styles.resultTitle}>
                        {r.title}
                        {r.mediaType === 'tv' && (
                          <span className={styles.mediaTypeBadge}>{t('movies.list.tvBadge')}</span>
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
                            <PaidAvailabilityChip
                              type="rent"
                              count={rentCount}
                              title={r.title}
                              watchPageUrl={safeWatchUrl}
                              t={t}
                            />
                          )}
                          {buyCount > 0 && (
                            <PaidAvailabilityChip
                              type="buy"
                              count={buyCount}
                              title={r.title}
                              watchPageUrl={safeWatchUrl}
                              t={t}
                            />
                          )}
                        </div>
                      )}
                  </div>
                  <div className={styles.resultAction}>
                    <button
                      type="button"
                      className={`btn btn-sm btn-primary ${styles.addButton}`}
                      onClick={() => addMovie(r)}
                      disabled={adding || alreadyAdded}
                      title={
                        alreadyAdded
                          ? (alreadyAddedHint ?? t('movies.search.alreadyListedHint'))
                          : undefined
                      }
                    >
                      {alreadyAdded
                        ? (alreadyAddedLabel ?? t('movies.search.alreadyListed'))
                        : t('movies.search.addButton')}
                    </button>
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

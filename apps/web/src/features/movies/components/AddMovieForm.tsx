import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import type { MovieData } from '@/shared/types/movie';
import { isSafeTmdbWatchPageUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import TmdbAttribution from '@/features/movies/components/TmdbAttribution';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useSearchHistory } from '@/features/movies/hooks/useSearchHistory';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { genreLabel } from '@/features/profile/lib/tmdbGenres';
import styles from './AddMovieForm.module.css';

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_MIN_CHARS = 2;

const MOVIE_GENRE_IDS = [
  28, 35, 53, 27, 878, 18, 12, 14, 10749, 80, 16, 10751, 99, 9648, 36, 10402, 10752, 37,
] as const;

const VOTE_MIN_OPTIONS = [6, 7, 8] as const;

const LANGUAGE_OPTIONS = [
  { code: 'fr', fr: 'Français', en: 'French', flag: '🇫🇷' },
  { code: 'en', fr: 'Anglais', en: 'English', flag: '🇬🇧' },
  { code: 'ja', fr: 'Japonais', en: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', fr: 'Coréen', en: 'Korean', flag: '🇰🇷' },
  { code: 'es', fr: 'Espagnol', en: 'Spanish', flag: '🇪🇸' },
  { code: 'de', fr: 'Allemand', en: 'German', flag: '🇩🇪' },
  { code: 'it', fr: 'Italien', en: 'Italian', flag: '🇮🇹' },
  { code: 'zh', fr: 'Chinois', en: 'Chinese', flag: '🇨🇳' },
] as const;

function makeSearchKey(term: string, filters: MovieSearchFilters): string {
  return `${term}|${(filters.genreIds ?? []).join(',')}|${filters.yearFrom ?? ''}|${filters.yearTo ?? ''}|${filters.voteMin ?? ''}|${filters.originalLanguage ?? ''}`;
}

function isSameTmdbItem(m: MovieData, r: MovieSearchItem): boolean {
  return m.tmdbId === r.id && (m.mediaType ?? 'movie') === (r.mediaType ?? 'movie');
}

function ResultMeta({
  year,
  voteLabel,
  runtimeLabel,
  voteTitle,
  runtimeTitle,
}: Readonly<{
  year?: string;
  voteLabel: string | null;
  runtimeLabel: string | null;
  voteTitle: string;
  runtimeTitle: string;
}>) {
  return (
    <div className={styles.resultMeta}>
      {year ? <span>{year}</span> : null}
      {voteLabel ? (
        <span className="tmdb-vote" title={voteTitle}>
          {year ? ' · ' : null}
          {voteLabel}
        </span>
      ) : null}
      {runtimeLabel ? (
        <span title={runtimeTitle}>
          {year || voteLabel ? ' · ' : null}
          {runtimeLabel}
        </span>
      ) : null}
    </div>
  );
}

interface AddMovieFormProps {
  slug: string;
  participantId: string;
  participantPseudo?: string;
  existingMovies?: MovieData[];
  onAdded: () => void;
  disabled?: boolean;
}

export default function AddMovieForm({
  slug,
  participantId,
  participantPseudo,
  existingMovies = [],
  onAdded,
  disabled,
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

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [yearFromInput, setYearFromInput] = useState('');
  const [yearToInput, setYearToInput] = useState('');
  const [voteMin, setVoteMin] = useState<number | undefined>(undefined);
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined);

  const trimmedForSearch = useMemo(() => query.trim(), [query]);

  const yearFromValid = useMemo(() => {
    const n = parseInt(yearFromInput, 10);
    return yearFromInput.length === 4 && !isNaN(n) && n >= 1888 && n <= 2099 ? n : undefined;
  }, [yearFromInput]);

  const yearToValid = useMemo(() => {
    const n = parseInt(yearToInput, 10);
    return yearToInput.length === 4 && !isNaN(n) && n >= 1888 && n <= 2099 ? n : undefined;
  }, [yearToInput]);

  const activeFilters: MovieSearchFilters = useMemo(
    () => ({
      genreIds: selectedGenres.length > 0 ? selectedGenres : undefined,
      yearFrom: yearFromValid,
      yearTo: yearToValid,
      voteMin,
      originalLanguage: selectedLanguage,
    }),
    [selectedGenres, yearFromValid, yearToValid, voteMin, selectedLanguage]
  );

  const hasActiveFilters =
    selectedGenres.length > 0 ||
    yearFromValid !== undefined ||
    yearToValid !== undefined ||
    voteMin !== undefined ||
    selectedLanguage !== undefined;

  const lastFulfilledKeyRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const immediateSearchRef = useRef(false);
  const filterChangedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const historyDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

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
    async (term: string, filters: MovieSearchFilters) => {
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
          filters,
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
        lastFulfilledKeyRef.current = makeSearchKey(term, filters);
        if (term.length >= SEARCH_MIN_CHARS) addToHistory(term);
        if (body.items.length === 0) {
          setEmptySearchKey(makeSearchKey(term, filters));
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

  const searchAllowed = trimmedForSearch.length >= SEARCH_MIN_CHARS || hasActiveFilters;
  const currentSearchKey = useMemo(
    () => makeSearchKey(trimmedForSearch, activeFilters),
    [trimmedForSearch, activeFilters]
  );

  const search = useCallback(() => {
    if (!searchAllowed) return;
    clearDebounceTimer();
    executeSearch(trimmedForSearch, activeFilters);
  }, [searchAllowed, trimmedForSearch, activeFilters, executeSearch, clearDebounceTimer]);

  useEffect(() => {
    const trimmed = trimmedForSearch;
    const shouldSearch = trimmed.length >= SEARCH_MIN_CHARS || hasActiveFilters;

    if (!shouldSearch) {
      immediateSearchRef.current = false;
      filterChangedRef.current = false;
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

    const immediate = immediateSearchRef.current || filterChangedRef.current;
    immediateSearchRef.current = false;
    filterChangedRef.current = false;

    if (immediate) {
      executeSearch(trimmed, activeFilters);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      executeSearch(trimmed, activeFilters);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearDebounceTimer();
    };
  }, [
    trimmedForSearch,
    hasActiveFilters,
    activeFilters,
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

  const toggleGenre = useCallback((id: number) => {
    filterChangedRef.current = true;
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }, []);

  const handleYearFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    filterChangedRef.current = true;
    setYearFromInput(val);
  }, []);

  const handleYearToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    filterChangedRef.current = true;
    setYearToInput(val);
  }, []);

  const toggleVoteMin = useCallback((min: number) => {
    filterChangedRef.current = true;
    setVoteMin((prev) => (prev === min ? undefined : min));
  }, []);

  const toggleLanguage = useCallback((code: string) => {
    filterChangedRef.current = true;
    setSelectedLanguage((prev) => (prev === code ? undefined : code));
  }, []);

  const clearAllFilters = useCallback(() => {
    filterChangedRef.current = true;
    setSelectedGenres([]);
    setYearFromInput('');
    setYearToInput('');
    setVoteMin(undefined);
    setSelectedLanguage(undefined);
  }, []);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    for (const id of selectedGenres) {
      chips.push({
        key: `g-${id}`,
        label: genreLabel(id, tmdbLanguage),
        onRemove: () => {
          filterChangedRef.current = true;
          setSelectedGenres((prev) => prev.filter((g) => g !== id));
        },
      });
    }
    if (yearFromValid != null && yearToValid != null) {
      chips.push({
        key: 'year',
        label: `${yearFromValid}–${yearToValid}`,
        onRemove: () => {
          filterChangedRef.current = true;
          setYearFromInput('');
          setYearToInput('');
        },
      });
    } else if (yearFromValid != null) {
      chips.push({
        key: 'year-from',
        label: `≥ ${yearFromValid}`,
        onRemove: () => {
          filterChangedRef.current = true;
          setYearFromInput('');
        },
      });
    } else if (yearToValid != null) {
      chips.push({
        key: 'year-to',
        label: `≤ ${yearToValid}`,
        onRemove: () => {
          filterChangedRef.current = true;
          setYearToInput('');
        },
      });
    }
    if (voteMin != null) {
      chips.push({
        key: 'vote',
        label: `★ ${voteMin}+`,
        onRemove: () => {
          filterChangedRef.current = true;
          setVoteMin(undefined);
        },
      });
    }
    if (selectedLanguage != null) {
      const opt = LANGUAGE_OPTIONS.find((l) => l.code === selectedLanguage);
      const label = opt
        ? `${opt.flag} ${tmdbLanguage.startsWith('fr') ? opt.fr : opt.en}`
        : selectedLanguage;
      chips.push({
        key: 'lang',
        label,
        onRemove: () => {
          filterChangedRef.current = true;
          setSelectedLanguage(undefined);
        },
      });
    }
    return chips;
  }, [selectedGenres, yearFromValid, yearToValid, voteMin, selectedLanguage, tmdbLanguage]);

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
      await addMovieToEvent(slug, {
        tmdbId: r.id,
        mediaType: r.mediaType,
        title: r.title,
        year: r.year,
        posterPath: r.posterPath,
        participantId,
      });
      track('movie_added', { mediaType: r.mediaType });
      clearSearchResults();
      setQuery('');
      onAdded();
    } catch (err) {
      setError(getErrorMessage(err, t('movies.search.addError')));
    } finally {
      setAdding(false);
    }
  };

  if (disabled) return null;

  const trimmed = trimmedForSearch;
  const showHistory = inputFocused && !trimmed && history.length > 0;
  const showMinCharsHint =
    trimmed.length > 0 && trimmed.length < SEARCH_MIN_CHARS && !hasActiveFilters;
  const showNoResultsBlock =
    !searching &&
    searchAllowed &&
    results.length === 0 &&
    !error &&
    emptySearchKey !== null &&
    emptySearchKey === currentSearchKey;

  const hasResultsBlock = results.length > 0;
  const activeFiltersCount = activeFilterChips.length;

  return (
    <div className={styles.root}>
      <label className="label" htmlFor="add-movie-search">
        {t('movies.search.label')}
      </label>
      <div className={styles.searchWrap} ref={containerRef}>
        <div className={styles.searchRow}>
          <div className={styles.inputWrap}>
            <input
              id="add-movie-search"
              type="search"
              className="input"
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
              placeholder={t('movies.search.placeholder')}
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
            className={`${styles.filterIconBtn} ${filtersOpen ? styles.filterIconBtnActive : ''}`}
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls={filtersPanelId}
            aria-label={t('movies.search.filtersToggle')}
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
            {activeFiltersCount > 0 && (
              <span className={styles.filtersBadge} aria-hidden="true">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="btn"
            onClick={search}
            disabled={searching || !searchAllowed}
          >
            {searching ? t('movies.search.searching') : t('movies.search.searchButton')}
          </button>
        </div>
      </div>

      {activeFilterChips.length > 0 && (
        <div className={styles.activeFiltersRow} aria-label={t('movies.search.filtersToggle')}>
          {activeFilterChips.map((chip) => (
            <span key={chip.key} className={styles.activeFilterChip}>
              {chip.label}
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
          <button type="button" className={styles.filtersClearAll} onClick={clearAllFilters}>
            {t('movies.search.filtersClearAll')}
          </button>
        </div>
      )}

      {filtersOpen && (
        <div id={filtersPanelId} className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>{t('movies.search.filterGenre')}</span>
            <div className={styles.genreChips}>
              {MOVIE_GENRE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`${styles.genreChip} ${selectedGenres.includes(id) ? styles.genreChipActive : ''}`}
                  onClick={() => toggleGenre(id)}
                  aria-pressed={selectedGenres.includes(id)}
                >
                  {genreLabel(id, tmdbLanguage)}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>{t('movies.search.filterYear')}</span>
            <div className={styles.yearRange}>
              <input
                type="text"
                inputMode="numeric"
                className="input"
                placeholder={t('movies.search.yearFromPlaceholder')}
                value={yearFromInput}
                onChange={handleYearFromChange}
                maxLength={4}
                aria-label={t('movies.search.yearFromAria')}
              />
              <span className={styles.yearRangeSep} aria-hidden="true">
                —
              </span>
              <input
                type="text"
                inputMode="numeric"
                className="input"
                placeholder={t('movies.search.yearToPlaceholder')}
                value={yearToInput}
                onChange={handleYearToChange}
                maxLength={4}
                aria-label={t('movies.search.yearToAria')}
              />
            </div>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>{t('movies.search.filterVoteMin')}</span>
            <div className={styles.voteChips}>
              {VOTE_MIN_OPTIONS.map((min) => (
                <button
                  key={min}
                  type="button"
                  className={`${styles.voteChip} ${voteMin === min ? styles.voteChipActive : ''}`}
                  onClick={() => toggleVoteMin(min)}
                  aria-pressed={voteMin === min}
                >
                  ★ {min}+
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>{t('movies.search.filterLanguage')}</span>
            <div className={styles.langChips}>
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`${styles.langChip} ${selectedLanguage === lang.code ? styles.langChipActive : ''}`}
                  onClick={() => toggleLanguage(lang.code)}
                  aria-pressed={selectedLanguage === lang.code}
                >
                  <span aria-hidden="true">{lang.flag}</span>
                  {tmdbLanguage.startsWith('fr') ? lang.fr : lang.en}
                </button>
              ))}
            </div>
          </div>
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
      {hasResultsBlock && (
        <>
          {searchMeta?.watchProvidersRegion ? (
            <p className={styles.regionHint}>
              {t('movies.search.regionHint', { region: searchMeta.watchProvidersRegion })}
            </p>
          ) : null}
          <ul className={styles.results} aria-label={t('movies.search.resultsListAria')}>
            {results.map((r) => {
              const voteLabel = formatTmdbVote(r.voteAverage);
              const runtimeLabel = formatRuntimeMinutes(r.runtimeMinutes);
              const providers = r.watchProviders ?? [];
              const posterSrcRaw = posterImageSrc(r.posterPath);
              const posterSrc = posterSrcRaw
                ? tmdbPosterSrcForListDisplay(posterSrcRaw)
                : undefined;
              const alreadyListed = existingMovies.find((m) => isSameTmdbItem(m, r));
              const seenHint = alreadyListed
                ? othersAlreadySeenHint(alreadyListed.seenByPseudos, participantPseudo, t)
                : null;
              const safeTmdbWatchUrl = isSafeTmdbWatchPageUrl(r.tmdbWatchPageUrl)
                ? r.tmdbWatchPageUrl
                : null;
              return (
                <li key={r.id} className={styles.resultItem}>
                  <div className={styles.posterWrap}>
                    {posterSrc ? (
                      <img src={posterSrc} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <div className={styles.posterPlaceholder}>
                        {t('movies.search.posterPlaceholder')}
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
                      <ResultMeta
                        year={r.year}
                        voteLabel={voteLabel}
                        runtimeLabel={runtimeLabel}
                        voteTitle={t('movies.search.tmdbVoteHint')}
                        runtimeTitle={t('movies.list.runtimeTitle')}
                      />
                    </div>
                    {alreadyListed ? (
                      <p className={`${styles.resultDuplicate} hint`}>
                        {t('movies.search.duplicateHint')}
                        {seenHint ? <> {seenHint}</> : null}
                      </p>
                    ) : null}
                    <WatchProviderChips
                      providers={providers}
                      title={r.title}
                      variant="compact"
                      watchPageUrl={safeTmdbWatchUrl}
                    />
                  </div>
                  <div className={styles.resultAction}>
                    <button
                      type="button"
                      className={`btn btn-sm btn-primary ${styles.addButton}`}
                      onClick={() => addMovie(r)}
                      disabled={adding || !!alreadyListed}
                      title={alreadyListed ? t('movies.search.alreadyListedHint') : undefined}
                    >
                      {alreadyListed
                        ? t('movies.search.alreadyListed')
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

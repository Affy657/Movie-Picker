import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  addMovieToEvent,
  searchMovies,
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
import styles from './AddMovieForm.module.css';

/** Délai après la dernière frappe avant d’appeler l’API (évite une requête par touche). */
const SEARCH_DEBOUNCE_MS = 350;
/** Longueur minimale du terme (hors espaces) avant recherche — TMDB est peu utile en dessous. */
const SEARCH_MIN_CHARS = 2;

interface AddMovieFormProps {
  slug: string;
  participantId: string;
  /** Pour l’indication « déjà vu par d’autres » sur une fiche déjà proposée. */
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
}: AddMovieFormProps) {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const minCharsHintId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSearchItem[]>([]);
  const [searchMeta, setSearchMeta] = useState<Pick<
    MovieSearchListResponse,
    'disclaimer' | 'watchProvidersRegion' | 'tmdbAttributionUrl'
  > | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** N’exécute l’effet de recherche que si le trim change (évite re-fetch sur espaces en fin seuls). */
  const trimmedForSearch = useMemo(() => query.trim(), [query]);
  /** Dernier terme pour lequel une réponse valide a été appliquée (évite résultats obsolètes). */
  const lastFulfilledTermRef = useRef<string | null>(null);
  /** Terme dont la dernière réponse était une liste vide (message « aucun résultat »). */
  const [emptyResultForTerm, setEmptyResultForTerm] = useState<string | null>(null);
  const [a11ySearchStatus, setA11ySearchStatus] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const clearSearchResults = useCallback(() => {
    lastFulfilledTermRef.current = null;
    setResults([]);
    setSearchMeta(null);
    setError(null);
    setEmptyResultForTerm(null);
    setA11ySearchStatus('');
    abortRef.current?.abort();
    setSearching(false);
  }, []);

  const executeSearch = useCallback(
    async (term: string) => {
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
        lastFulfilledTermRef.current = term;
        if (body.items.length === 0) {
          setEmptyResultForTerm(term);
          setA11ySearchStatus(t('movies.search.a11yNoResults'));
        } else {
          setEmptyResultForTerm(null);
          setA11ySearchStatus(t('movies.search.a11yResultsCount', { count: body.items.length }));
        }
      } catch (err) {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError'))
          return;
        lastFulfilledTermRef.current = null;
        setEmptyResultForTerm(null);
        setA11ySearchStatus('');
        setError(getErrorMessage(err, t('movies.search.fallbackError')));
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    },
    [tmdbLanguage, t, slug]
  );

  /** Recherche immédiate (bouton, Entrée) : mêmes règles que la recherche automatique. */
  const search = useCallback(() => {
    if (trimmedForSearch.length < SEARCH_MIN_CHARS) return;
    clearDebounceTimer();
    void executeSearch(trimmedForSearch);
  }, [trimmedForSearch, executeSearch, clearDebounceTimer]);

  /** Pendant la saisie : debounce puis recherche si assez de caractères. */
  useEffect(() => {
    const trimmed = trimmedForSearch;

    if (!trimmed) {
      clearDebounceTimer();
      clearSearchResults();
      return;
    }

    if (trimmed.length < SEARCH_MIN_CHARS) {
      clearDebounceTimer();
      clearSearchResults();
      return;
    }

    abortRef.current?.abort();
    if (trimmed !== lastFulfilledTermRef.current) {
      setResults([]);
      setSearchMeta(null);
      setError(null);
      setEmptyResultForTerm(null);
      lastFulfilledTermRef.current = null;
    }

    clearDebounceTimer();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void executeSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearDebounceTimer();
    };
  }, [trimmedForSearch, executeSearch, clearDebounceTimer, clearSearchResults]);

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
  const showMinCharsHint = trimmed.length > 0 && trimmed.length < SEARCH_MIN_CHARS;
  const searchAllowed = trimmed.length >= SEARCH_MIN_CHARS;
  const showNoResultsBlock =
    !searching &&
    searchAllowed &&
    results.length === 0 &&
    !error &&
    emptyResultForTerm !== null &&
    emptyResultForTerm === trimmed;

  const hasResultsBlock = results.length > 0;

  return (
    <div className={styles.root}>
      <label className="label" htmlFor="add-movie-search">
        {t('movies.search.label')}
      </label>
      <div className={styles.searchRow}>
        <input
          id="add-movie-search"
          type="search"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())}
          placeholder={t('movies.search.placeholder')}
          aria-busy={searching}
          aria-describedby={showMinCharsHint ? minCharsHintId : undefined}
        />
        <button
          type="button"
          className="btn"
          onClick={search}
          disabled={searching || !searchAllowed}
        >
          {searching ? t('movies.search.searching') : t('movies.search.searchButton')}
        </button>
      </div>
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
          {t('movies.search.noResultsForQuery', { query: trimmed })}
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
              const alreadyListed = existingMovies.find(
                (m) => m.tmdbId === r.id && (m.mediaType ?? 'movie') === (r.mediaType ?? 'movie')
              );
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
                          <span className={styles.mediaTypeBadge}>
                            {t('movies.list.tvBadge')}
                          </span>
                        )}
                      </span>
                      <div className={styles.resultMeta}>
                        {r.year ? <span>{r.year}</span> : null}
                        {voteLabel ? (
                          <span className="tmdb-vote" title={t('movies.search.tmdbVoteHint')}>
                            {r.year ? ' · ' : null}
                            {voteLabel}
                          </span>
                        ) : null}
                        {runtimeLabel ? (
                          <span title={t('movies.list.runtimeTitle')}>
                            {r.year || voteLabel ? ' · ' : null}
                            {runtimeLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {alreadyListed ? (
                      <p className={`${styles.resultDuplicate} hint`}>
                        {t('movies.search.duplicateHint')}
                        {seenHint ? <> {seenHint}</> : null}
                      </p>
                    ) : null}
                    <WatchProviderChips
                      providers={providers}
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

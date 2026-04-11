import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  addMovieToEvent,
  searchMovies,
  type MovieSearchItem,
  type MovieSearchListResponse,
} from '@/features/movies/api/moviesApi';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import type { MovieData } from '@/shared/types/movie';
import { othersAlreadySeenHint } from '@/shared/utils/movieReactions';
import TmdbIndicativeFooter from '@/features/movies/components/TmdbIndicativeFooter';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import styles from './AddMovieForm.module.css';

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSearchItem[]>([]);
  const [searchMeta, setSearchMeta] = useState<Pick<
    MovieSearchListResponse,
    'disclaimer' | 'watchProvidersRegion' | 'tmdbAttributionUrl'
  > | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const executeSearch = useCallback(async (term: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setSearching(true);
    setResults([]);
    setSearchMeta(null);
    try {
      const body = await searchMovies(term, { signal: controller.signal, lang: tmdbLanguage });
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
    } catch (err) {
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
      setError(getErrorMessage(err, t('movies.search.fallbackError')));
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, [tmdbLanguage, t]);

  const search = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    void executeSearch(trimmed);
  };

  const addMovie = async (r: MovieSearchItem) => {
    setError(null);
    setAdding(true);
    try {
      await addMovieToEvent(slug, {
        tmdbId: r.id,
        title: r.title,
        year: r.year,
        posterPath: r.posterPath,
        participantId,
      });
      setResults([]);
      setSearchMeta(null);
      setQuery('');
      onAdded();
    } catch (err) {
      setError(getErrorMessage(err, t('movies.search.addError')));
    } finally {
      setAdding(false);
    }
  };

  if (disabled) return null;

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
        />
        <button
          type="button"
          className={clsx('btn', styles.searchBtn)}
          onClick={search}
          disabled={searching}
        >
          {searching ? t('movies.search.searching') : t('movies.search.searchButton')}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {results.length > 0 && (
        <>
          {searchMeta?.watchProvidersRegion ? (
            <p className={styles.regionHint}>
              {t('movies.search.regionHint', { region: searchMeta.watchProvidersRegion })}
            </p>
          ) : null}
          <ul className={styles.results}>
            {results.map((r) => {
              const voteLabel = formatTmdbVote(r.voteAverage);
              const providers = r.watchProviders ?? [];
              const posterSrcRaw = posterImageSrc(r.posterPath);
              const posterSrc = posterSrcRaw
                ? tmdbPosterSrcForListDisplay(posterSrcRaw)
                : undefined;
              const alreadyListed = existingMovies.find((m) => m.tmdbId === r.id);
              const seenHint = alreadyListed
                ? othersAlreadySeenHint(alreadyListed.reactions, participantPseudo)
                : null;
              return (
                <li key={r.id} className={styles.resultItem}>
                  <div className={styles.posterWrap}>
                    {posterSrc ? (
                      <img src={posterSrc} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <div className={styles.posterPlaceholder}>{t('movies.search.posterPlaceholder')}</div>
                    )}
                  </div>
                  <div className={styles.resultMain}>
                    <div className={styles.resultBody}>
                      <div className={styles.resultTextCol}>
                        <span className={styles.resultTitle}>{r.title}</span>
                        <div className={styles.resultMeta}>
                          {r.year ? <span>{r.year}</span> : null}
                          {voteLabel ? (
                            <span className="tmdb-vote" title={t('movies.search.tmdbVoteHint')}>
                              {r.year ? ' · ' : null}TMDB {voteLabel}
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
                      <WatchProviderChips providers={providers} variant="compact" />
                      {r.tmdbWatchPageUrl ? (
                        <a
                          className="tmdb-watch-link"
                          href={r.tmdbWatchPageUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {t('movies.list.watchLinkSearch')}
                        </a>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={clsx('btn', 'btn-sm', 'btn-primary', styles.addButton)}
                      onClick={() => addMovie(r)}
                      disabled={adding || !!alreadyListed}
                      title={alreadyListed ? t('movies.search.alreadyListedHint') : undefined}
                    >
                      {alreadyListed ? t('movies.search.alreadyListed') : t('movies.search.addButton')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <TmdbIndicativeFooter
            disclaimer={searchMeta?.disclaimer}
            tmdbUrl={searchMeta?.tmdbAttributionUrl}
            className={`tmdb-indicative-footer ${styles.tmdbFooter}`}
          />
        </>
      )}
    </div>
  );
}

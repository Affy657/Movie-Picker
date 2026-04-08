import { useState } from 'react';
import { fetchApi } from '../api/client';
import { posterImageSrc } from '../utils/posterUrl';
import { formatTmdbVote } from '../utils/formatTmdbVote';
import type { MovieData, WatchProviderOffer } from '../types/event';
import { othersAlreadySeenHint } from '../utils/movieReactions';
import TmdbIndicativeFooter from './TmdbIndicativeFooter';
import WatchProviderChips from './WatchProviderChips';

interface MovieSearchItem {
  id: number;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  watchProviders?: WatchProviderOffer[];
  tmdbWatchPageUrl?: string | null;
}

interface MovieSearchListResponse {
  items: MovieSearchItem[];
  watchProvidersRegion: string;
  disclaimer: string;
  tmdbAttributionUrl: string;
}

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSearchItem[]>([]);
  const [searchMeta, setSearchMeta] = useState<Pick<
    MovieSearchListResponse,
    'disclaimer' | 'watchProvidersRegion' | 'tmdbAttributionUrl'
  > | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setError(null);
    setSearching(true);
    setResults([]);
    setSearchMeta(null);
    try {
      const body = await fetchApi<MovieSearchListResponse | MovieSearchItem[]>(
        `/movies/search?q=${encodeURIComponent(query.trim())}`
      );
      if (Array.isArray(body)) {
        setResults(body);
        setSearchMeta(null);
      } else {
        setResults(body.items ?? []);
        setSearchMeta({
          disclaimer: body.disclaimer,
          watchProvidersRegion: body.watchProvidersRegion,
          tmdbAttributionUrl: body.tmdbAttributionUrl,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recherche indisponible');
    } finally {
      setSearching(false);
    }
  };

  const addMovie = async (r: MovieSearchItem) => {
    setError(null);
    setAdding(true);
    try {
      await fetchApi(`/events/${slug}/movies`, {
        method: 'POST',
        body: JSON.stringify({
          tmdbId: r.id,
          title: r.title,
          year: r.year,
          posterPath: r.posterPath,
          participantId,
        }),
      });
      setResults([]);
      setSearchMeta(null);
      setQuery('');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setAdding(false);
    }
  };

  if (disabled) return null;

  return (
    <div className="add-movie">
      <label className="label">Proposer un film</label>
      <div className="search-row">
        <input
          type="search"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())}
          placeholder="Rechercher un film…"
        />
        <button type="button" className="btn" onClick={search} disabled={searching}>
          {searching ? '…' : 'Rechercher'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {results.length > 0 && (
        <>
          {searchMeta?.watchProvidersRegion ? (
            <p className="tmdb-region-hint">
              Disponibilités indicatives · région {searchMeta.watchProvidersRegion}
            </p>
          ) : null}
          <ul className="search-results">
            {results.map((r) => {
              const voteLabel = formatTmdbVote(r.voteAverage);
              const providers = r.watchProviders ?? [];
              const posterSrc = posterImageSrc(r.posterPath);
              const alreadyListed = existingMovies.find((m) => m.tmdbId === r.id);
              const seenHint = alreadyListed
                ? othersAlreadySeenHint(alreadyListed.reactions, participantPseudo)
                : null;
              return (
                <li key={r.id} className="search-result-item">
                  {posterSrc ? (
                    <img src={posterSrc} alt="" width={46} height={69} />
                  ) : (
                    <div className="poster-placeholder">Affiche</div>
                  )}
                  <div className="search-result-body">
                    <div className="search-result-title-row">
                      <span className="search-result-title">
                        {r.title} ({r.year})
                        {voteLabel ? (
                          <span className="tmdb-vote" title="Note moyenne TMDB (indicatif)">
                            {' '}
                            · TMDB {voteLabel}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => addMovie(r)}
                        disabled={adding || !!alreadyListed}
                        title={
                          alreadyListed ? 'Ce film est déjà dans la liste de la soirée' : undefined
                        }
                      >
                        {alreadyListed ? 'Déjà listé' : 'Ajouter'}
                      </button>
                    </div>
                    {alreadyListed ? (
                      <p className="search-result-duplicate hint">
                        Déjà proposé dans cette soirée.
                        {seenHint ? <> {seenHint}</> : null}
                      </p>
                    ) : null}
                    <WatchProviderChips providers={providers} />
                    {r.tmdbWatchPageUrl ? (
                      <a
                        className="tmdb-watch-link"
                        href={r.tmdbWatchPageUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Voir les options sur TMDB
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <TmdbIndicativeFooter
            disclaimer={searchMeta?.disclaimer}
            tmdbUrl={searchMeta?.tmdbAttributionUrl}
            className="tmdb-indicative-footer search-tmdb-footer"
          />
        </>
      )}
    </div>
  );
}

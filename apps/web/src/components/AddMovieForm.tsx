import { useState } from 'react';
import { fetchApi } from '../api/client';

interface TmdbResult {
  id: number;
  title: string;
  year: string;
  posterPath: string | null;
}

interface AddMovieFormProps {
  slug: string;
  participantId: string;
  onAdded: () => void;
  disabled?: boolean;
}

export default function AddMovieForm({ slug, participantId, onAdded, disabled }: AddMovieFormProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setError(null);
    setSearching(true);
    setResults([]);
    try {
      const list = await fetchApi<TmdbResult[]>(`/movies/search?q=${encodeURIComponent(query.trim())}`);
      setResults(list ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recherche indisponible');
    } finally {
      setSearching(false);
    }
  };

  const addMovie = async (r: TmdbResult) => {
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
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.id} className="search-result-item">
              {r.posterPath ? (
                <img src={r.posterPath} alt="" width={46} height={69} />
              ) : (
                <div className="poster-placeholder">Affiche</div>
              )}
              <span>{r.title} ({r.year})</span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => addMovie(r)}
                disabled={adding}
              >
                Ajouter
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

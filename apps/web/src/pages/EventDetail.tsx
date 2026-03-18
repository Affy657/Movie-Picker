import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useLocation, Link } from 'react-router-dom';
import { fetchApi } from '../api/client';
import type { EventData, MovieData } from '../types/event';
import { getStoredParticipant, getStoredHostToken, setStoredHostToken } from '../types/event';
import JoinForm from '../components/JoinForm';
import ShareLink from '../components/ShareLink';
import MovieList from '../components/MovieList';
import AddMovieForm from '../components/AddMovieForm';
import WheelSection from '../components/WheelSection';

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const hostFromUrl = searchParams.get('host');
  const hostFromStorage = slug ? getStoredHostToken(slug) : null;
  const hostToken = hostFromUrl ?? hostFromStorage;
  const shareUrlFromState = (location.state as { shareUrl?: string } | null)?.shareUrl;

  useEffect(() => {
    if (slug && hostFromUrl) setStoredHostToken(slug, hostFromUrl);
  }, [slug, hostFromUrl]);

  const [event, setEvent] = useState<EventData | null>(null);
  const [movies, setMovies] = useState<MovieData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participant, setParticipant] = useState<{ participantId: string; pseudo: string } | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const eventUrl = slug
    ? `/events/slug/${slug}${hostToken ? `?host=${encodeURIComponent(hostToken)}` : ''}`
    : '';

  const loadEvent = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await fetchApi<EventData>(eventUrl);
      setEvent(data);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      setError(
        msg.includes('introuvable') || msg.includes('404')
          ? "Cette soirée n'existe pas ou a été supprimée."
          : msg
      );
      return null;
    }
  }, [slug, eventUrl]);

  const loadMovies = useCallback(async () => {
    if (!slug) return;
    try {
      const list = await fetchApi<MovieData[]>(`/events/${slug}/movies`);
      setMovies(Array.isArray(list) ? list : []);
    } catch {
      setMovies([]);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setParticipant(getStoredParticipant(slug));
    loadEvent()
      .then(() => loadMovies())
      .finally(() => setLoading(false));
  }, [slug, loadEvent, loadMovies]);

  const refreshAll = useCallback(() => {
    loadEvent().then((data) => {
      if (data?.winnerMovie) setEvent((e) => (e ? { ...e, winnerMovie: data.winnerMovie } : null));
    });
    loadMovies();
  }, [loadEvent, loadMovies]);

  if (loading)
    return (
      <main className="page">
        <p>Chargement…</p>
      </main>
    );
  if (error) {
    return (
      <main className="page">
        <p className="error">{error}</p>
        <Link to="/" className="btn">
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }
  if (!event) return null;

  const dateFormatted = `${event.date} à ${event.time}`;
  const shareUrl =
    shareUrlFromState ??
    (slug
      ? `${window.location.origin}/s/${slug}${hostToken ? `?host=${encodeURIComponent(hostToken)}` : ''}`
      : '');
  const needsJoin = !event.terminé && !participant;
  const showContent = event.terminé || participant;

  return (
    <main className="page page-event">
      <header className="event-header">
        <Link to="/" className="back-link">
          ← Accueil
        </Link>
        <h1>{event.title}</h1>
        <p className="event-meta">{dateFormatted}</p>
        {event.terminé && <p className="badge badge-finished">Soirée terminée</p>}
        {event.isHost && shareUrl && <ShareLink url={shareUrl} />}
      </header>

      {needsJoin && (
        <JoinForm
          slug={slug!}
          onJoined={(participantId, pseudo) => setParticipant({ participantId, pseudo })}
        />
      )}

      {showContent && (
        <>
          <section className="section section-movies" aria-label="Films proposés">
            <h2>Films</h2>
            {!event.terminé && participant && (
              <AddMovieForm
                slug={slug!}
                participantId={participant.participantId}
                onAdded={refreshAll}
                disabled={event.terminé}
              />
            )}
            {actionError && (
              <div className="error error-dismiss" role="alert">
                <span>{actionError}</span>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setActionError(null)}
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>
            )}
            <MovieList
              movies={movies}
              participantId={participant?.participantId ?? null}
              terminé={!!event.terminé}
              onVote={async (movieId, value) => {
                if (!participant) return;
                setActionError(null);
                try {
                  await fetchApi(`/events/${slug}/movies/${movieId}/vote`, {
                    method: 'POST',
                    body: JSON.stringify({ participantId: participant.participantId, value }),
                  });
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : 'Erreur lors du vote');
                  throw e;
                }
              }}
              onRemove={async (movieId) => {
                if (!participant) return;
                setActionError(null);
                try {
                  await fetchApi(`/events/${slug}/movies/${movieId}`, {
                    method: 'DELETE',
                    body: JSON.stringify({ participantId: participant.participantId }),
                  });
                } catch (e) {
                  setActionError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
                  throw e;
                }
              }}
              refresh={refreshAll}
            />
          </section>

          <WheelSection
            slug={slug!}
            event={event}
            moviesCount={movies.length}
            hostToken={hostToken}
            onWheelDone={refreshAll}
            onCloseDone={refreshAll}
          />
        </>
      )}
    </main>
  );
}

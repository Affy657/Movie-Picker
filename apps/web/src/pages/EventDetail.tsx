import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getStoredParticipant, getStoredHostToken, setStoredHostToken } from '../types/event';
import { queryKeys } from '../hooks/queryKeys';
import { useEvent } from '../hooks/useEvent';
import { useMovies } from '../hooks/useMovies';
import { useEventLive } from '../hooks/useEventLive';
import JoinForm from '../components/JoinForm';
import WheelSection from '../components/WheelSection';
import EventDetailHeader from './event-detail/EventDetailHeader';
import EventMoviesLoadError from './event-detail/EventMoviesLoadError';
import EventMoviesSection from './event-detail/EventMoviesSection';
import { friendlyEventError } from './event-detail/friendlyEventError';
import { APP_DOCUMENT_TITLE, pageTitle, useDocumentTitle } from '../hooks/useDocumentTitle';

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const hostFromUrl = searchParams.get('host');
  const hostFromStorage = slug ? getStoredHostToken(slug) : null;
  const hostToken = hostFromUrl ?? hostFromStorage;
  const shareUrlFromState = (location.state as { shareUrl?: string } | null)?.shareUrl;

  useEffect(() => {
    if (slug && hostFromUrl) setStoredHostToken(slug, hostFromUrl);
  }, [slug, hostFromUrl]);

  const eventQuery = useEvent(slug, hostToken);
  const event = eventQuery.data ?? null;

  const documentTitle = !slug
    ? APP_DOCUMENT_TITLE
    : eventQuery.isPending
      ? pageTitle('Chargement')
      : eventQuery.isError
        ? pageTitle('Soirée introuvable')
        : event
          ? pageTitle(event.title)
          : APP_DOCUMENT_TITLE;
  useDocumentTitle(documentTitle);

  const moviesQueryEnabled = !!slug && eventQuery.isSuccess;
  const { moviesRefetchInterval } = useEventLive(event ?? undefined, { moviesQueryEnabled });

  const moviesQuery = useMovies(slug, {
    enabled: moviesQueryEnabled,
    refetchInterval: moviesRefetchInterval,
  });

  const movies = moviesQuery.data ?? [];

  const [participant, setParticipant] = useState<{ participantId: string; pseudo: string } | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) setParticipant(getStoredParticipant(slug));
  }, [slug]);

  const refreshAll = useCallback(() => {
    if (!slug) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
  }, [slug, hostToken, queryClient]);

  if (!slug) return null;

  if (eventQuery.isPending) {
    return (
      <main className="page">
        <p>Chargement…</p>
      </main>
    );
  }

  if (eventQuery.isError) {
    const errorMessage = friendlyEventError(eventQuery.error);
    return (
      <main className="page">
        <p className="error">{errorMessage}</p>
        <Link to="/" className="btn">
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  if (!event) return null;

  const dateFormatted = `${event.date} à ${event.time}`;
  const shareUrlGuests = shareUrlFromState ?? `${window.location.origin}/s/${slug}`;
  const shareUrlHost = hostToken
    ? `${window.location.origin}/s/${slug}?host=${encodeURIComponent(hostToken)}`
    : '';
  const needsJoin = !event.terminé && !participant;
  const showContent = event.terminé || participant;

  return (
    <main className="page page-event">
      <EventDetailHeader
        title={event.title}
        dateFormatted={dateFormatted}
        terminé={!!event.terminé}
        isHost={!!event.isHost}
        shareUrlGuests={shareUrlGuests}
        shareUrlHost={shareUrlHost}
      />

      {moviesQuery.isError && (
        <EventMoviesLoadError
          error={moviesQuery.error}
          onRetry={() => void moviesQuery.refetch()}
        />
      )}

      {needsJoin && (
        <JoinForm
          slug={slug}
          onJoined={(participantId, pseudo) => setParticipant({ participantId, pseudo })}
        />
      )}

      {showContent && (
        <>
          <EventMoviesSection
            slug={slug}
            event={event}
            participant={participant}
            movies={movies}
            moviesQuery={moviesQuery}
            actionError={actionError}
            onDismissActionError={() => setActionError(null)}
            setActionError={setActionError}
            refreshAll={refreshAll}
          />

          <WheelSection
            slug={slug}
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

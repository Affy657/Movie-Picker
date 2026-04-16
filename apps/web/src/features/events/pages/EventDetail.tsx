import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { formatEventStartInUserTimezone } from '@/shared/utils/eventScheduled';
import { themeHueFromLabel } from '@/shared/utils/eventThemeHue';
import JoinForm from '@/features/events/components/JoinForm';
import WheelSection from '@/features/events/components/WheelSection';
import HostEventSettingsPanel from '@/features/events/components/HostEventSettingsPanel';
import EventParticipantsList from '@/features/events/components/EventParticipantsList';
import EventDetailHeader from '@/features/events/pages/event-detail/EventDetailHeader';
import EventDetailSkeleton from '@/features/events/pages/event-detail/EventDetailSkeleton';
import EventMoviesLoadError from '@/features/events/pages/event-detail/EventMoviesLoadError';
import EventMoviesSection from '@/features/events/pages/event-detail/EventMoviesSection';
import { friendlyEventError } from '@/features/events/pages/event-detail/friendlyEventError';
import { APP_DOCUMENT_TITLE, pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import EventStartReminderBanner from '@/features/events/components/EventStartReminderBanner';
import PageLayout from '@/shared/components/PageLayout';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const {
    hostToken,
    eventQuery,
    event,
    moviesQuery,
    movies,
    participant,
    setParticipant,
    actionError,
    setActionError,
    refreshAll,
    shareUrlFromState,
  } = useEventDetailPage(slug);

  const themeHue = themeHueFromLabel(event?.config?.theme);
  const themeStyle = useMemo(
    () => (themeHue == null ? undefined : { borderTop: `3px solid hsl(${themeHue} 48% 42%)` }),
    [themeHue]
  );

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

  if (!slug) return null;

  if (eventQuery.isPending) {
    return (
      <PageLayout className="page-event">
        <EventDetailSkeleton />
      </PageLayout>
    );
  }

  if (eventQuery.isError) {
    const errorMessage = friendlyEventError(eventQuery.error);
    return (
      <PageLayout className="page-event page--centered">
        <p className="error" role="alert">
          {errorMessage}
        </p>
        <Link to={ROUTES.home} className="btn">
          Retour à l&apos;accueil
        </Link>
      </PageLayout>
    );
  }

  if (!event) return null;

  const dateFormatted =
    formatEventStartInUserTimezone(event.date, event.time) ?? `${event.date} à ${event.time}`;
  const shareUrl = shareUrlFromState ?? `${window.location.origin}${ROUTES.eventDetail(slug)}`;
  const needsJoin = !event.isFinished && !participant;
  const showContent = event.isFinished || participant;

  return (
    <PageLayout className="page-event" style={themeStyle}>
      {!event.isFinished && (
        <EventStartReminderBanner
          date={event.date}
          time={event.time}
          isFinished={!!event.isFinished}
        />
      )}
      <EventDetailHeader
        title={event.title}
        dateFormatted={dateFormatted}
        isFinished={!!event.isFinished}
        eventTheme={event.config?.theme}
        shareUrl={shareUrl}
      />
      {event.isHost && <HostEventSettingsPanel slug={slug} hostToken={hostToken} event={event} />}

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
          <EventParticipantsList
            participants={event.participants}
            currentParticipantId={participant?.participantId ?? null}
          />

          <EventMoviesSection
            slug={slug}
            event={event}
            participant={participant}
            hostToken={hostToken}
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
    </PageLayout>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/routes';
import {
  formatMyEventsListDate,
  formatEventTime,
  formatEventDateLong,
} from '@/shared/utils/formatMyEventsListDate';
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
import EventPendingBanner from '@/features/events/components/EventPendingBanner';
import EventClosedWithoutMovieState from '@/features/events/pages/event-detail/EventClosedWithoutMovieState';
import PageLayout from '@/shared/components/PageLayout';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';
import { removeEventParticipant, eventFrontendUrl } from '@/features/events/api/eventsApi';
import { removeStoredParticipant } from '@/features/events/storage';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import InviteModal from '@/features/events/components/InviteModal';
import EventWheelActions from '@/features/events/components/EventWheelActions';
import { useEventWheel } from '@/features/events/hooks/useEventWheel';
import { eventCountdown, type EventCountdown } from '@/shared/utils/eventCountdown';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';

type ConfirmState =
  | { kind: 'remove'; participantId: string; pseudo: string }
  | { kind: 'leave' }
  | { kind: 'closeWithoutMovie' }
  | null;

const SUCCESS_AUTO_DISMISS_MS = 3500;

const COUNTDOWN_TICK_MS = 60_000;

const COUNTDOWN_KEYS = {
  imminent: 'events.detail.countdownImminent',
  minutes: 'events.detail.countdownMinutes',
  hours: 'events.detail.countdownHours',
} as const satisfies Record<EventCountdown['unit'], TranslationKey>;

function getDocumentTitle(
  slug: string | undefined,
  isPending: boolean,
  isError: boolean,
  eventTitle: string | undefined
): string {
  if (!slug) return APP_DOCUMENT_TITLE;
  if (isPending) return pageTitle('Chargement');
  if (isError) return pageTitle('Soirée introuvable');
  if (eventTitle) return pageTitle(eventTitle);
  return APP_DOCUMENT_TITLE;
}

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { locale } = useLocale();
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
  } = useEventDetailPage(slug);

  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem('movies-view') === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  });

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('movies-view', mode);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (event?.isFinished) return;
    const id = globalThis.setInterval(() => setNowMs(Date.now()), COUNTDOWN_TICK_MS);
    return () => globalThis.clearInterval(id);
  }, [event?.isFinished]);

  useEffect(() => {
    if (!event?.isHost || event?.isFinished || event?.winnerMovie) {
      setSettingsOpen(false);
    }
  }, [event?.isHost, event?.isFinished, event?.winnerMovie]);

  useEffect(() => {
    if (!actionSuccess) return;
    const id = globalThis.setTimeout(() => setActionSuccess(null), SUCCESS_AUTO_DISMISS_MS);
    return () => globalThis.clearTimeout(id);
  }, [actionSuccess]);

  const removeParticipantMutation = useMutation({
    mutationFn: (variables: { participantId: string }) =>
      removeEventParticipant(slug ?? '', variables.participantId, hostToken),
    onMutate: ({ participantId }) => {
      setPendingRemovalId(participantId);
    },
    onSettled: () => {
      setPendingRemovalId(null);
      if (slug) {
        queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    },
  });

  const wheel = useEventWheel({
    slug: slug ?? '',
    event: event ?? undefined,
    movies,
    hostToken,
    onWheelDone: refreshAll,
    onCloseDone: refreshAll,
  });

  const documentTitle = getDocumentTitle(
    slug,
    eventQuery.isPending,
    eventQuery.isError,
    event?.title
  );
  useDocumentTitle(documentTitle);

  const isConnectedSelf =
    !!event?.myParticipant?.id && participant?.participantId === event.myParticipant.id;

  const handleRemoveParticipant = useCallback(
    (participantId: string, pseudo: string) => {
      if (!slug) return;
      setConfirmState({ kind: 'remove', participantId, pseudo });
    },
    [slug]
  );

  const handleLeaveEvent = useCallback(() => {
    if (!slug || !participant) return;
    setConfirmState({ kind: 'leave' });
  }, [slug, participant]);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  const confirmRemove = useCallback(
    (participantId: string, pseudo: string) => {
      if (!slug) return;
      setActionError(null);
      removeParticipantMutation.mutate(
        { participantId },
        {
          onSuccess: () => {
            setActionSuccess(t('events.participants.removeSuccess', { pseudo }));
          },
          onError: (err) => {
            setActionError(getErrorMessage(err, t('events.participants.removeError')));
          },
          onSettled: () => {
            setConfirmState(null);
          },
        }
      );
    },
    [slug, removeParticipantMutation, setActionError, t]
  );

  const confirmLeave = useCallback(() => {
    if (!slug || !participant) return;
    setActionError(null);

    removeParticipantMutation.mutate(
      { participantId: participant.participantId },
      {
        onSuccess: () => {
          removeStoredParticipant(slug);
          setParticipant(null);
          navigate(ROUTES.myEvents);
        },
        onError: (err) => {
          setActionError(getErrorMessage(err, t('events.participants.leaveError')));
        },
        onSettled: () => {
          setConfirmState(null);
        },
      }
    );
  }, [slug, participant, removeParticipantMutation, setActionError, setParticipant, navigate, t]);

  const [closeWithoutMovieRequested, setCloseWithoutMovieRequested] = useState(false);

  const confirmCloseWithoutMovie = useCallback(() => {
    setCloseWithoutMovieRequested(true);
    wheel.closeEvent();
  }, [wheel]);

  useEffect(() => {
    if (closeWithoutMovieRequested && !wheel.loading) {
      setCloseWithoutMovieRequested(false);
      setConfirmState(null);
    }
  }, [closeWithoutMovieRequested, wheel.loading]);

  const confirmDialogContent = useMemo(() => {
    if (!confirmState) return null;
    if (confirmState.kind === 'remove') {
      return {
        title: t('events.participants.removeConfirmTitle'),
        message: t('events.participants.removeConfirm', { pseudo: confirmState.pseudo }),
        confirmLabel: t('events.participants.removeConfirmAction'),
        onConfirm: () => confirmRemove(confirmState.participantId, confirmState.pseudo),
      };
    }
    if (confirmState.kind === 'closeWithoutMovie') {
      return {
        title: t('events.wheel.closeWithoutMovieConfirmTitle'),
        message: t('events.wheel.closeWithoutMovieConfirmMessage', { title: event?.title ?? '' }),
        confirmLabel: t('events.wheel.closeWithoutMovieConfirmAction'),
        onConfirm: confirmCloseWithoutMovie,
      };
    }
    return {
      title: t('events.participants.leaveConfirmTitle'),
      message: t('events.participants.leaveConfirm'),
      confirmLabel: t('events.participants.leaveConfirmAction'),
      onConfirm: confirmLeave,
    };
  }, [confirmState, t, confirmRemove, confirmLeave, confirmCloseWithoutMovie, event?.title]);

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
      <PageLayout className="page-event page--centered page--errorState">
        <span className="errorStateIcon" aria-hidden>
          <AlertCircle size={32} />
        </span>
        <p className="errorStateMessage" role="alert">
          {errorMessage}
        </p>
        <Link to={ROUTES.home} className="btn">
          Retour à l&apos;accueil
        </Link>
      </PageLayout>
    );
  }

  if (!event) return null;

  const timeFormatted = formatEventTime(event.time);
  const dateLabel = formatMyEventsListDate(event.date, locale);
  const dateFormatted = formatEventDateLong(
    event.date,
    event.time,
    locale,
    t('events.detail.dateTimeJoiner')
  );
  const shareUrl = eventFrontendUrl(slug);
  const needsJoin = !event.isFinished && !participant;
  const showContent = event.isFinished || participant;
  const maxParticipants = event.config?.maxParticipants ?? null;
  const myParticipantSummary =
    participant && event.participants
      ? event.participants.find((p) => p.id === participant.participantId)
      : null;
  const isCreatorSelf = !!myParticipantSummary?.isCreator;
  const canShowLeave = !event.isFinished && !!participant && !isCreatorSelf;

  const participantCount = event.participantCount ?? event.participants?.length ?? 0;
  const moviesCount = moviesQuery.isSuccess ? movies.length : (event.movieCount ?? 0);
  const votesCount = movies.reduce((total, m) => total + m.up + m.down, 0);
  const lifecycle = normalizeMyEventLifecycle(event.lifecycle);
  const countdown = eventCountdown(event.date, event.time, nowMs);
  const countdownLabel = countdown
    ? t(
        COUNTDOWN_KEYS[countdown.unit],
        countdown.unit === 'imminent' ? undefined : { count: countdown.count }
      )
    : null;
  const canConfigure = !!event.isHost && !event.isFinished && !event.winnerMovie;
  const isFull =
    typeof maxParticipants === 'number' &&
    maxParticipants > 0 &&
    participantCount >= maxParticipants;

  return (
    <PageLayout className="page-event">
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
        eventTime={timeFormatted}
        eventDate={dateLabel}
        rawDate={event.date}
        rawTime={event.time}
        isFinished={!!event.isFinished}
        eventTheme={event.config?.theme}
        eventThemeColor={event.config?.themeColor}
        shareUrl={shareUrl}
        lifecycle={lifecycle}
        countdownLabel={countdownLabel}
        participants={event.participants}
        participantCount={participantCount}
        moviesCount={moviesCount}
        votesCount={votesCount}
        participantsOpen={participantsOpen}
        onToggleParticipants={() => setParticipantsOpen((value) => !value)}
        onInviteFriends={
          event.isHost && !event.isFinished ? () => setInviteModalOpen(true) : undefined
        }
        onOpenSettings={canConfigure ? () => setSettingsOpen(true) : undefined}
        wheelActions={
          showContent ? (
            <EventWheelActions
              wheel={wheel}
              onRequestCloseWithoutMovie={() => setConfirmState({ kind: 'closeWithoutMovie' })}
            />
          ) : null
        }
      />
      {lifecycle === 'pending' && <EventPendingBanner isHost={!!event.isHost} />}
      {canConfigure && (
        <HostEventSettingsPanel
          slug={slug}
          hostToken={hostToken}
          event={event}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {wheel.error && (
        <p className="error" role="alert">
          {wheel.error}
        </p>
      )}

      {event.isHost && !event.isFinished && (
        <InviteModal open={inviteModalOpen} slug={slug} onClose={() => setInviteModalOpen(false)} />
      )}

      {moviesQuery.isError && (
        <EventMoviesLoadError error={moviesQuery.error} onRetry={() => moviesQuery.refetch()} />
      )}

      {needsJoin && (
        <JoinForm
          slug={slug}
          onJoined={(participantId, pseudo) => setParticipant({ participantId, pseudo })}
          isFull={isFull}
          maxParticipants={maxParticipants}
        />
      )}

      {showContent && (
        <>
          {participantsOpen && (
            <EventParticipantsList
              participants={event.participants}
              currentParticipantId={participant?.participantId ?? null}
              maxParticipants={maxParticipants}
              isHost={!!event.isHost}
              pendingRemovalId={pendingRemovalId}
              onRemoveParticipant={event.isFinished ? undefined : handleRemoveParticipant}
              onInvite={
                event.isHost && !event.isFinished ? () => setInviteModalOpen(true) : undefined
              }
              onLeave={canShowLeave ? handleLeaveEvent : undefined}
              leaveDisabled={
                isConnectedSelf &&
                removeParticipantMutation.isPending &&
                pendingRemovalId === participant?.participantId
              }
            />
          )}

          {actionSuccess && (
            <p
              className="success"
              role="status"
              aria-live="polite"
              data-testid="participants-action-success"
            >
              {actionSuccess}
            </p>
          )}

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
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />

          <WheelSection
            slug={slug}
            event={event}
            movies={movies}
            wheel={wheel}
            viewMode={viewMode}
          />

          {event.isFinished && !event.winnerMovie && (
            <EventClosedWithoutMovieState isHost={!!event.isHost} />
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDialogContent !== null}
        title={confirmDialogContent?.title ?? ''}
        message={confirmDialogContent?.message ?? ''}
        confirmLabel={confirmDialogContent?.confirmLabel ?? ''}
        confirmVariant="danger"
        busy={
          confirmState?.kind === 'closeWithoutMovie'
            ? wheel.loading
            : removeParticipantMutation.isPending
        }
        onConfirm={confirmDialogContent?.onConfirm ?? closeConfirm}
        onCancel={closeConfirm}
      />
    </PageLayout>
  );
}

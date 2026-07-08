import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/routes';
import { formatMyEventsListDate, formatEventTime } from '@/shared/utils/formatMyEventsListDate';
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
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';
import { removeEventParticipant, eventFrontendUrl } from '@/features/events/api/eventsApi';
import { removeStoredParticipant } from '@/features/events/storage';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation } from '@/shared/i18n';
import InviteModal from '@/features/events/components/InviteModal';

type ConfirmState =
  { kind: 'remove'; participantId: string; pseudo: string } | { kind: 'leave' } | null;

const SUCCESS_AUTO_DISMISS_MS = 3500;

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

  const themeHue = themeHueFromLabel(event?.config?.theme);
  const themeStyle = useMemo(
    () => (themeHue == null ? undefined : { borderTop: `3px solid hsl(${themeHue} 48% 42%)` }),
    [themeHue]
  );

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
    return {
      title: t('events.participants.leaveConfirmTitle'),
      message: t('events.participants.leaveConfirm'),
      confirmLabel: t('events.participants.leaveConfirmAction'),
      onConfirm: confirmLeave,
    };
  }, [confirmState, t, confirmRemove, confirmLeave]);

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
  const dateFormatted = `${timeFormatted} – ${dateLabel}`;
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
  const isFull =
    typeof maxParticipants === 'number' &&
    maxParticipants > 0 &&
    participantCount >= maxParticipants;

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
        eventTime={timeFormatted}
        eventDate={dateLabel}
        rawDate={event.date}
        rawTime={event.time}
        isFinished={!!event.isFinished}
        eventTheme={event.config?.theme}
        eventThemeColor={event.config?.themeColor}
        shareUrl={shareUrl}
      />
      {event.isHost && !event.isFinished && !event.winnerMovie && (
        <HostEventSettingsPanel slug={slug} hostToken={hostToken} event={event} />
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
          />

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

          {canShowLeave && (
            <div style={{ margin: '0 0 1rem 0' }}>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={handleLeaveEvent}
                disabled={
                  isConnectedSelf &&
                  removeParticipantMutation.isPending &&
                  pendingRemovalId === participant?.participantId
                }
                data-testid="leave-event-button"
              >
                {t('events.participants.leaveAction')}
              </button>
            </div>
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
            hostToken={hostToken}
            onWheelDone={refreshAll}
            onCloseDone={refreshAll}
            viewMode={viewMode}
          />
        </>
      )}

      <ConfirmDialog
        open={confirmDialogContent !== null}
        title={confirmDialogContent?.title ?? ''}
        message={confirmDialogContent?.message ?? ''}
        confirmLabel={confirmDialogContent?.confirmLabel ?? ''}
        confirmVariant="danger"
        busy={removeParticipantMutation.isPending}
        onConfirm={confirmDialogContent?.onConfirm ?? closeConfirm}
        onCancel={closeConfirm}
      />
    </PageLayout>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';
import { removeEventParticipant, eventSharePreviewUrl } from '@/features/events/api/eventsApi';
import { removeStoredParticipant } from '@/features/events/storage';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';

/**
 * Etat de la modale de confirmation pour les actions destructives.
 * - `remove` : l'hôte retire un participant donné.
 * - `leave`  : le participant courant quitte la soirée.
 */
type ConfirmState =
  | { kind: 'remove'; participantId: string; pseudo: string }
  | { kind: 'leave' }
  | null;

/** Durée d'affichage du message de succès inline (ms) avant auto-dismiss. */
const SUCCESS_AUTO_DISMISS_MS = 3500;

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
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

  // Auto-dismiss du message de succès. Le timer est nettoyé si le message change
  // ou si le composant se démonte (ex. navigation après un « quitter »).
  useEffect(() => {
    if (!actionSuccess) return;
    const id = window.setTimeout(() => setActionSuccess(null), SUCCESS_AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.guestJoined });
    },
  });

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

  // Handlers définis avant les early-returns pour respecter les règles des hooks.
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

    if (isConnectedSelf) {
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
      return;
    }

    // Invité (sans compte connecté) : nettoyage local uniquement (V1).
    removeStoredParticipant(slug);
    setParticipant(null);
    setConfirmState(null);
    navigate(ROUTES.home);
  }, [
    slug,
    participant,
    isConnectedSelf,
    removeParticipantMutation,
    setActionError,
    setParticipant,
    navigate,
    t,
  ]);

  // Libellés de la modale dérivés de l'état courant. Mémoïsés pour éviter
  // toute incohérence visuelle (ex. afficher des libellés « remove » alors
  // que la modale vient d'être fermée pour un « leave »).
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
      message: t(
        isConnectedSelf
          ? 'events.participants.leaveConfirm'
          : 'events.participants.leaveConfirmGuest'
      ),
      confirmLabel: t('events.participants.leaveConfirmAction'),
      onConfirm: confirmLeave,
    };
  }, [confirmState, isConnectedSelf, t, confirmRemove, confirmLeave]);

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

  const dateFormatted =
    formatEventStartInUserTimezone(event.date, event.time) ?? `${event.date} à ${event.time}`;
  const shareUrl = eventSharePreviewUrl(slug);
  const needsJoin = !event.isFinished && !participant;
  const showContent = event.isFinished || participant;
  const maxParticipants = event.config?.maxParticipants ?? null;
  // Le créateur ne peut pas quitter sa propre soirée (la garde API renvoie 409
  // si on tente quand même). On masque donc le bouton côté UI pour rester
  // cohérent avec le badge « hôte » à côté de son pseudo.
  const myParticipantSummary =
    participant && event.participants
      ? event.participants.find((p) => p.id === participant.participantId)
      : null;
  const isCreatorSelf = !!myParticipantSummary?.isCreator;
  const canShowLeave = !event.isFinished && !!participant && !isCreatorSelf;

  // Source autoritaire : `participantCount` retourné par l'API détail.
  // Fallback sur `participants?.length` pour les anciens mocks/tests sans cette clé.
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
            onRemoveParticipant={handleRemoveParticipant}
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

      {/*
        Une seule modale de confirmation pilotée par `confirmState` (les actions
        retrait / quitter sont mutuellement exclusives). On évite ainsi des
        nœuds DOM dupliqués (et le bruit côté tests / lecteurs d'écran).
      */}
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

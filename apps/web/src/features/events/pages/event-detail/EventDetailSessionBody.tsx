import { Suspense, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import EventParticipantsList from '@/features/events/components/EventParticipantsList';
import EventMoviesSection from '@/features/events/pages/event-detail/EventMoviesSection';
import EventClosedWithoutMovieState from '@/features/events/pages/event-detail/EventClosedWithoutMovieState';
import EventWinnerSummary, {
  type WinnerRatingContext,
} from '@/features/events/pages/event-detail/EventWinnerSummary';
import { useEventMovieRating } from '@/features/events/pages/event-detail/useEventMovieRating';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import styles from './EventDetailSession.module.css';
import { WheelModal } from './eventDetailOverlays';
import type {
  MoviesSectionState,
  ParticipantRef,
  ParticipantsPanelState,
  WheelApi,
} from './eventDetailSessionTypes';

function EventParticipantsPanel({
  event,
  participant,
  panel,
}: Readonly<{
  event: EventData;
  participant: ParticipantRef | null;
  panel: ParticipantsPanelState;
}>) {
  const hostCanInvite = !!event.isHost && !event.isFinished;
  const currentParticipantId = participant?.participantId ?? null;
  return (
    <div ref={panel.ref}>
      <EventParticipantsList
        participants={event.participants}
        currentParticipantId={currentParticipantId}
        maxParticipants={event.config?.maxParticipants ?? null}
        isHost={!!event.isHost}
        pendingRemovalId={panel.pendingRemovalId}
        onRemoveParticipant={event.isFinished ? undefined : panel.onRemove}
        onInvite={hostCanInvite ? panel.onInviteFriends : undefined}
        onLeave={panel.canShowLeave ? panel.onLeave : undefined}
        leaveDisabled={
          panel.isConnectedSelf &&
          panel.removePending &&
          panel.pendingRemovalId === currentParticipantId
        }
      />
    </div>
  );
}

function EventWheelModalGate({ wheel }: Readonly<{ wheel: WheelApi }>) {
  if (!wheel.isModalOpen || wheel.winnerIndex < 0 || !wheel.spinWinner) return null;
  return (
    <Suspense fallback={null}>
      <WheelModal
        open={wheel.isModalOpen}
        movies={wheel.spinPool}
        winnerIndex={wheel.winnerIndex}
        winner={wheel.spinWinner}
        wheelKey={wheel.wheelKey}
        onClose={wheel.dismissModal}
        onSpinComplete={wheel.revealWinner}
        onRelaunch={wheel.canRelaunchFromModal ? wheel.launch : undefined}
        skipSpin={wheel.manualReveal}
        winnerCount={wheel.winnerCount}
        remainingDraws={wheel.remainingDraws}
      />
    </Suspense>
  );
}

export default function EventDetailSessionBody({
  slug,
  event,
  participant,
  hostToken,
  movies,
  moviesQuery,
  actionError,
  setActionError,
  refreshAll,
  actionSuccess,
  wheel,
  participantsPanel,
  moviesSection,
}: Readonly<{
  slug: string;
  event: EventData;
  participant: ParticipantRef | null;
  hostToken: string | null;
  movies: MovieData[];
  moviesQuery: UseQueryResult<MovieData[]>;
  actionError: string | null;
  setActionError: Dispatch<SetStateAction<string | null>>;
  refreshAll: () => void;
  actionSuccess: string | null;
  wheel: WheelApi;
  participantsPanel: ParticipantsPanelState;
  moviesSection: MoviesSectionState;
}>) {
  const winners = useMemo(
    () =>
      wheel.winnerIds
        .map((id) => movies.find((movie) => movie.id === id))
        .filter((movie): movie is MovieData => movie !== undefined),
    [wheel.winnerIds, movies]
  );
  const participantAvatars = useMemo(
    () =>
      Object.fromEntries(
        (event.participants ?? [])
          .filter((p) => p.avatarId)
          .map((p) => [p.id, p.avatarId as string])
      ),
    [event.participants]
  );
  const { user } = useAuth();
  const movieRating = useEventMovieRating({ slug, participant, refreshAll });
  const rating: WinnerRatingContext = {
    scale: user?.ratingScale ?? 'five',
    participants: event.participants ?? [],
    currentParticipantId: participant?.participantId ?? null,
    saving: movieRating.saving,
    error: movieRating.error,
    onSave: movieRating.save,
    onClear: movieRating.clear,
  };
  return (
    <>
      {participantsPanel.open ? (
        <EventParticipantsPanel event={event} participant={participant} panel={participantsPanel} />
      ) : null}
      {actionSuccess ? (
        <p
          className="success"
          role="status"
          aria-live="polite"
          data-testid="participants-action-success"
        >
          {actionSuccess}
        </p>
      ) : null}
      <EventWheelModalGate wheel={wheel} />
      {wheel.manualMode || wheel.removalMode ? null : (
        <EventWinnerSummary
          winners={winners}
          isFinished={!!event.isFinished}
          participantAvatars={participantAvatars}
          rating={rating}
        />
      )}
      <div ref={moviesSection.ref} className={styles.moviesSection}>
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
          onRequestRemove={moviesSection.onRequestRemove}
          viewMode={moviesSection.viewMode}
          selection={moviesSection.selection}
          addMovieOpen={moviesSection.addMovieOpen}
          onAddMovieOpenChange={moviesSection.onAddMovieOpenChange}
          addMovieTriggerRef={moviesSection.addMovieTriggerRef}
          winnerMovieIds={wheel.winnerIds}
          isFull={moviesSection.isFull}
        />
      </div>
      {event.isFinished && (event.winners?.length ?? 0) === 0 ? (
        <EventClosedWithoutMovieState isHost={!!event.isHost} />
      ) : null}
    </>
  );
}

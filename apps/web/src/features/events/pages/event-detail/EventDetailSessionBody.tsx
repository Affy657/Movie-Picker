import { Suspense, useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import EventParticipantsList from '@/features/events/components/EventParticipantsList';
import EventMoviesSection from '@/features/events/pages/event-detail/EventMoviesSection';
import EventClosedWithoutMovieState from '@/features/events/pages/event-detail/EventClosedWithoutMovieState';
import EventWinnerSummary from '@/features/events/pages/event-detail/EventWinnerSummary';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import styles from './EventDetailSession.module.css';
import { WheelModal } from './eventDetailOverlays';
import type { MoviesViewMode, ParticipantRef, WheelApi } from './eventDetailSessionTypes';

function EventParticipantsPanel({
  event,
  participant,
  participantsRef,
  pendingRemovalId,
  onRemoveParticipant,
  onInviteFriends,
  onLeave,
  canShowLeave,
  isConnectedSelf,
  removePending,
}: Readonly<{
  event: EventData;
  participant: ParticipantRef | null;
  participantsRef: RefObject<HTMLDivElement | null>;
  pendingRemovalId: string | null;
  onRemoveParticipant: (participantId: string, pseudo: string) => void;
  onInviteFriends: () => void;
  onLeave: () => void;
  canShowLeave: boolean;
  isConnectedSelf: boolean;
  removePending: boolean;
}>) {
  const hostCanInvite = !!event.isHost && !event.isFinished;
  const currentParticipantId = participant?.participantId ?? null;
  return (
    <div ref={participantsRef}>
      <EventParticipantsList
        participants={event.participants}
        currentParticipantId={currentParticipantId}
        maxParticipants={event.config?.maxParticipants ?? null}
        isHost={!!event.isHost}
        pendingRemovalId={pendingRemovalId}
        onRemoveParticipant={event.isFinished ? undefined : onRemoveParticipant}
        onInvite={hostCanInvite ? onInviteFriends : undefined}
        onLeave={canShowLeave ? onLeave : undefined}
        leaveDisabled={
          isConnectedSelf && removePending && pendingRemovalId === currentParticipantId
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
  viewMode,
  selection,
  addMovieOpen,
  onAddMovieOpenChange,
  addMovieTriggerRef,
  moviesSectionRef,
  participantsOpen,
  participantsRef,
  pendingRemovalId,
  onRemoveParticipant,
  onRequestRemoveMovie,
  onInviteFriends,
  onLeave,
  canShowLeave,
  isConnectedSelf,
  removePending,
  actionSuccess,
  wheel,
  isFull,
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
  viewMode: MoviesViewMode;
  selection: MovieCardSelection | undefined;
  addMovieOpen: boolean;
  onAddMovieOpenChange: (open: boolean) => void;
  addMovieTriggerRef: RefObject<HTMLButtonElement | null>;
  moviesSectionRef: RefObject<HTMLDivElement | null>;
  participantsOpen: boolean;
  participantsRef: RefObject<HTMLDivElement | null>;
  pendingRemovalId: string | null;
  onRemoveParticipant: (participantId: string, pseudo: string) => void;
  onRequestRemoveMovie: (movie: MovieData) => void;
  onInviteFriends: () => void;
  onLeave: () => void;
  canShowLeave: boolean;
  isConnectedSelf: boolean;
  removePending: boolean;
  actionSuccess: string | null;
  wheel: WheelApi;
  isFull: boolean;
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
  return (
    <>
      {participantsOpen ? (
        <EventParticipantsPanel
          event={event}
          participant={participant}
          participantsRef={participantsRef}
          pendingRemovalId={pendingRemovalId}
          onRemoveParticipant={onRemoveParticipant}
          onInviteFriends={onInviteFriends}
          onLeave={onLeave}
          canShowLeave={canShowLeave}
          isConnectedSelf={isConnectedSelf}
          removePending={removePending}
        />
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
        />
      )}
      <div ref={moviesSectionRef} className={styles.moviesSection}>
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
          onRequestRemove={onRequestRemoveMovie}
          viewMode={viewMode}
          selection={selection}
          addMovieOpen={addMovieOpen}
          onAddMovieOpenChange={onAddMovieOpenChange}
          addMovieTriggerRef={addMovieTriggerRef}
          winnerMovieIds={wheel.winnerIds}
          isFull={isFull}
        />
      </div>
      {event.isFinished && (event.winners?.length ?? 0) === 0 ? (
        <EventClosedWithoutMovieState isHost={!!event.isHost} />
      ) : null}
    </>
  );
}

import { Suspense, type Dispatch, type SetStateAction } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import EventParticipantsList from '@/features/events/components/EventParticipantsList';
import EventMoviesSection from '@/features/events/pages/event-detail/EventMoviesSection';
import EventClosedWithoutMovieState from '@/features/events/pages/event-detail/EventClosedWithoutMovieState';
import ViewModeToggle from '@/shared/components/ViewModeToggle';
import { useTranslation } from '@/shared/i18n';
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
        onRemoveParticipant={panel.canRemove ? panel.onRemove : undefined}
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
        weights={wheel.spinWeights}
        winnerIndex={wheel.winnerIndex}
        winner={wheel.spinWinner}
        wheelKey={wheel.wheelKey}
        onClose={wheel.dismissModal}
        onSpinComplete={wheel.revealWinner}
        onRelaunch={wheel.canRelaunchFromModal ? wheel.launch : undefined}
        relaunching={wheel.loading}
        relaunchError={wheel.error}
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
  const { t } = useTranslation();
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
      <div ref={moviesSection.ref} className={styles.moviesSection}>
        {moviesSection.titled ? (
          <div className={styles.moviesToolbar}>
            <span className={styles.moviesLabel} aria-hidden>
              {t('movies.list.sectionLabel')}
            </span>
            <ViewModeToggle
              value={moviesSection.viewMode}
              onChange={moviesSection.onViewModeChange}
            />
          </div>
        ) : null}
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
          onRequestRemoveNote={moviesSection.onRequestRemoveNote}
          viewMode={moviesSection.viewMode}
          selection={moviesSection.selection}
          addMovieOpen={moviesSection.addMovieOpen}
          onAddMovieOpenChange={moviesSection.onAddMovieOpenChange}
          addMovieTriggerRef={moviesSection.addMovieTriggerRef}
          winnerMovieIds={wheel.winnerIds}
          isFull={moviesSection.isFull}
          wheelLocked={moviesSection.wheelLocked}
        />
      </div>
      {event.isFinished && (event.winners?.length ?? 0) === 0 ? (
        <EventClosedWithoutMovieState isHost={!!event.isHost} />
      ) : null}
    </>
  );
}

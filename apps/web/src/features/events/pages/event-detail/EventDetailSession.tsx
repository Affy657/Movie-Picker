import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  formatMyEventsListDate,
  formatEventTime,
  formatEventDateLong,
} from '@/shared/utils/formatMyEventsListDate';
import PageLayout from '@/shared/components/PageLayout';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Notice from '@/shared/components/Notice';
import type { LivePresence } from '@/features/events/hooks/useEventLiveStream';
import { useProposingPresence } from '@/features/events/hooks/useProposingPresence';
import { presenceView } from '@/features/events/utils/presenceView';
import {
  offlineVoteReport,
  type OfflineVoteOutcome,
} from '@/features/events/offline/useOfflineVoteReplay';
import { eventFrontendUrl, nightRecapFrontendUrl } from '@/features/events/api/eventsApi';
import { useLocale, useTranslation } from '@/shared/i18n';
import { useEventWheel } from '@/features/events/hooks/useEventWheel';
import { eventCountdownLabel } from '@/features/events/utils/eventCountdownLabel';
import type { MovieCardSelection } from '@/features/events/components/eventMovieCardParts';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { persistMoviesViewMode, readMoviesViewMode } from '@/features/events/moviesViewMode';
import EventDetailSessionChrome from './EventDetailSessionChrome';
import EventWinnerStage, { isWinnerStageShown } from './EventWinnerStage';
import EventDetailSessionBody from './EventDetailSessionBody';
import { OVERLAY_CHUNKS } from './eventDetailOverlays';
import { useEventDetailActions } from './useEventDetailActions';
import type {
  MoviesViewMode,
  ParticipantRef,
  RecapShare,
  ShareTab,
} from './eventDetailSessionTypes';

type EventDetailSessionProps = {
  slug: string;
  hostToken: string | null;
  event: EventData;
  moviesQuery: UseQueryResult<MovieData[]>;
  movies: MovieData[];
  participant: ParticipantRef | null;
  setParticipant: Dispatch<SetStateAction<ParticipantRef | null>>;
  actionError: string | null;
  setActionError: Dispatch<SetStateAction<string | null>>;
  refreshAll: () => void;
  connectionUnstable?: boolean;
  proposeOnArrival?: boolean;
  livePresence?: LivePresence[] | null;
  offline?: boolean;
  offlineVoteOutcome?: OfflineVoteOutcome | null;
  onDismissOfflineVoteOutcome?: () => void;
};

const COUNTDOWN_TICK_MS = 60_000;

function wheelSelection(wheel: ReturnType<typeof useEventWheel>): MovieCardSelection | undefined {
  if (wheel.manualMode) {
    return {
      active: true,
      mode: 'pick',
      pending: wheel.loading,
      selectableIds: wheel.drawableMovies.map((m) => m.id),
      onSelect: wheel.pickWinnerManually,
    };
  }
  if (wheel.removalMode) {
    return {
      active: true,
      mode: 'remove',
      pending: wheel.loading,
      selectableIds: wheel.winnerIds,
      onSelect: wheel.removeWinner,
    };
  }
  return undefined;
}

function sessionCapabilities(input: {
  event: EventData;
  participant: ParticipantRef | null;
  offline: boolean;
  wheelLocked: boolean;
  moviesShownEmpty: boolean;
}) {
  const { event, participant, wheelLocked, moviesShownEmpty } = input;
  const reachable = !input.offline;
  const open = !event.isFinished;
  const mine = participant
    ? event.participants?.find((p) => p.id === participant.participantId)
    : undefined;
  const participantsLocked = !open || wheelLocked;
  return {
    needsJoin: open && !participant && reachable,
    canShowLeave: !participantsLocked && !!participant && !mine?.isCreator && reachable,
    canRemoveParticipants: !participantsLocked && reachable,
    canConfigure: !!event.isHost && open && reachable,
    canAddMovie: open && !!participant && !moviesShownEmpty && reachable,
  };
}

function isNightFull(maxParticipants: number | null, participantCount: number): boolean {
  return (
    typeof maxParticipants === 'number' &&
    maxParticipants > 0 &&
    participantCount >= maxParticipants
  );
}

export default function EventDetailSession({
  slug,
  hostToken,
  event,
  moviesQuery,
  movies,
  participant,
  setParticipant,
  actionError,
  setActionError,
  refreshAll,
  connectionUnstable = false,
  proposeOnArrival = false,
  livePresence = null,
  offline = false,
  offlineVoteOutcome = null,
  onDismissOfflineVoteOutcome,
}: Readonly<EventDetailSessionProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const [shareOpen, setShareOpen] = useState(false);
  useIdlePrefetch(OVERLAY_CHUNKS);
  const [shareInitialTab, setShareInitialTab] = useState<ShareTab>('link');
  const openShare = useCallback((tab: ShareTab = 'link') => {
    setShareInitialTab(tab);
    setShareOpen(true);
  }, []);
  const [addMovieOpen, setAddMovieOpen] = useState(proposeOnArrival);
  const addMovieTriggerRef = useRef<HTMLButtonElement>(null);
  const moviesSectionRef = useRef<HTMLDivElement>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const closeParticipants = useCallback(() => setParticipantsOpen(false), []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<MoviesViewMode>(readMoviesViewMode);

  const handleViewModeChange = (mode: MoviesViewMode) => {
    setViewMode(mode);
    persistMoviesViewMode(mode);
  };

  useEffect(() => {
    if (event.isFinished) return;
    const id = globalThis.setInterval(() => setNowMs(Date.now()), COUNTDOWN_TICK_MS);
    return () => globalThis.clearInterval(id);
  }, [event.isFinished]);

  useEffect(() => {
    if (!event.isHost || event.isFinished) {
      setSettingsOpen(false);
    }
  }, [event.isHost, event.isFinished]);

  const wheel = useEventWheel({
    slug,
    event,
    movies,
    hostToken,
    onWheelDone: refreshAll,
  });

  useEffect(() => {
    if (wheel.manualMode || wheel.removalMode) {
      moviesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [wheel.manualMode, wheel.removalMode]);

  const selection = wheelSelection(wheel);

  const isConnectedSelf =
    !!event.myParticipant?.id && participant?.participantId === event.myParticipant.id;

  const {
    confirmDialogContent,
    closeConfirm,
    pendingRemovalId,
    removePending,
    actionSuccess,
    handleRemoveParticipant,
    handleRequestRemoveMovie,
    handleRequestRemoveNote,
    handleLeaveEvent,
    requestResetWheel,
    requestCloseWithoutMovie,
    requestFinishNight,
  } = useEventDetailActions({
    slug,
    hostToken,
    eventTitle: event.title,
    participant,
    setParticipant,
    setActionError,
    refreshAll,
    wheel,
  });

  const timeFormatted = formatEventTime(event.time);
  const dateLabel = formatMyEventsListDate(event.date, locale);
  const dateFormatted = formatEventDateLong(
    event.date,
    event.time,
    locale,
    t('events.detail.dateTimeJoiner')
  );
  const firstWinnerId = wheel.winnerIds[0];
  const winnerMovies = useMemo(() => {
    const byId = new Map(movies.map((movie) => [movie.id, movie]));
    return wheel.winnerIds
      .map((movieId) => byId.get(movieId))
      .filter((movie): movie is MovieData => !!movie);
  }, [wheel.winnerIds, movies]);
  const recap: RecapShare | null =
    event.isFinished && firstWinnerId && event.recapSlug ? { winners: winnerMovies } : null;
  const shareUrl =
    recap && event.recapSlug ? nightRecapFrontendUrl(event.recapSlug) : eventFrontendUrl(slug);
  const maxParticipants = event.config?.maxParticipants ?? null;

  const participantCount = event.participantCount ?? event.participants?.length ?? 0;
  let moviesCount = event.movieCount ?? 0;
  const moviesLoaded = moviesQuery.data !== undefined;
  if (moviesLoaded) moviesCount = movies.length;
  const lifecycle = normalizeMyEventLifecycle(event.lifecycle);
  const countdownLabel = eventCountdownLabel(event.date, event.time, nowMs, t);
  const showWinnerStage = isWinnerStageShown(winnerMovies, wheel);
  const { needsJoin, canShowLeave, canRemoveParticipants, canConfigure, canAddMovie } =
    sessionCapabilities({
      event,
      participant,
      offline,
      wheelLocked: wheel.wheelLocked,
      moviesShownEmpty: moviesLoaded && movies.length === 0,
    });
  const isFull = isNightFull(maxParticipants, participantCount);
  const presence = presenceView(
    event.participants,
    livePresence,
    participant?.participantId ?? null
  );
  const voteReport = offlineVoteReport(offlineVoteOutcome, t);
  useProposingPresence({
    slug,
    active: addMovieOpen && !!participant && !event.isFinished,
  });

  return (
    <PageLayout className="page-event">
      <EventDetailSessionChrome
        slug={slug}
        hostToken={hostToken}
        event={event}
        moviesQuery={moviesQuery}
        lifecycle={lifecycle}
        countdownLabel={countdownLabel}
        counts={{ participants: participantCount, movies: moviesCount }}
        dates={{ dateFormatted, timeFormatted, dateLabel }}
        share={{
          open: shareOpen,
          initialTab: shareInitialTab,
          url: shareUrl,
          recap,
          onOpen: openShare,
          onClose: () => setShareOpen(false),
        }}
        settings={{
          open: settingsOpen,
          canConfigure,
          onOpen: () => setSettingsOpen(true),
          onClose: () => setSettingsOpen(false),
        }}
        participants={{
          count: participantCount,
          onOpen: () => setParticipantsOpen(true),
        }}
        addMovie={{
          canAdd: canAddMovie,
          onOpen: () => setAddMovieOpen(true),
          triggerRef: addMovieTriggerRef,
        }}
        join={{ needsJoin, isFull, maxParticipants, setParticipant }}
        wheel={wheel}
        onRequestResetWheel={requestResetWheel}
        onRequestCloseWithoutMovie={requestCloseWithoutMovie}
        onRequestFinishNight={requestFinishNight}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        viewToggleInHeader={!showWinnerStage}
        connectionUnstable={connectionUnstable}
        onRetryConnection={refreshAll}
        offline={offline}
        onlineCount={presence.onlineCount}
        proposerNames={presence.proposerNames}
      />
      {showWinnerStage ? (
        <EventWinnerStage
          slug={slug}
          event={event}
          winners={winnerMovies}
          participant={participant}
          refreshAll={refreshAll}
          holdRatingPrompt={wheel.isModalOpen}
        />
      ) : null}
      <EventDetailSessionBody
        slug={slug}
        event={event}
        participant={participant}
        hostToken={hostToken}
        movies={movies}
        moviesQuery={moviesQuery}
        actionError={actionError}
        setActionError={setActionError}
        refreshAll={refreshAll}
        actionSuccess={actionSuccess}
        wheel={wheel}
        participantsPanel={{
          open: participantsOpen,
          onClose: closeParticipants,
          pendingRemovalId,
          removePending,
          canShowLeave,
          canRemove: canRemoveParticipants,
          onlineIds: presence.onlineIds,
          proposingIds: presence.proposingIds,
          isConnectedSelf,
          onRemove: handleRemoveParticipant,
          onInviteFriends: () => openShare('friends'),
          onLeave: handleLeaveEvent,
        }}
        moviesSection={{
          ref: moviesSectionRef,
          viewMode,
          titled: showWinnerStage,
          onViewModeChange: handleViewModeChange,
          selection,
          addMovieOpen,
          onAddMovieOpenChange: setAddMovieOpen,
          addMovieTriggerRef,
          isFull,
          offline,
          wheelLocked: wheel.wheelLocked,
          onRequestRemove: handleRequestRemoveMovie,
          onRequestRemoveNote: handleRequestRemoveNote,
        }}
      />
      {voteReport ? (
        <Notice
          title={t('events.detail.offlineVotesTitle')}
          description={voteReport.message}
          onClose={onDismissOfflineVoteOutcome}
        />
      ) : null}
      <ConfirmDialog
        open={confirmDialogContent !== null}
        title={confirmDialogContent?.title ?? ''}
        message={confirmDialogContent?.message ?? ''}
        confirmLabel={confirmDialogContent?.confirmLabel ?? ''}
        loading={confirmDialogContent?.loading ?? false}
        onConfirm={confirmDialogContent?.onConfirm ?? closeConfirm}
        onCancel={closeConfirm}
      />
    </PageLayout>
  );
}

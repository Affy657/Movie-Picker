import {
  useCallback,
  useEffect,
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
import { eventFrontendUrl } from '@/features/events/api/eventsApi';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import { useEventWheel } from '@/features/events/hooks/useEventWheel';
import { eventCountdown, type EventCountdown } from '@/shared/utils/eventCountdown';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { persistMoviesViewMode, readMoviesViewMode } from '@/features/events/moviesViewMode';
import EventDetailSessionChrome from './EventDetailSessionChrome';
import EventDetailSessionBody from './EventDetailSessionBody';
import { OVERLAY_CHUNKS } from './eventDetailOverlays';
import { useEventDetailActions } from './useEventDetailActions';
import type { MoviesViewMode, ParticipantRef, ShareTab } from './eventDetailSessionTypes';

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
};

const COUNTDOWN_TICK_MS = 60_000;

const COUNTDOWN_KEYS = {
  imminent: 'events.detail.countdownImminent',
  minutes: 'events.detail.countdownMinutes',
  hours: 'events.detail.countdownHours',
} as const satisfies Record<EventCountdown['unit'], TranslationKey>;

function countdownParams(countdown: EventCountdown) {
  if (countdown.unit === 'imminent') return undefined;
  return { count: countdown.count };
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
  const [addMovieOpen, setAddMovieOpen] = useState(false);
  const addMovieTriggerRef = useRef<HTMLButtonElement>(null);
  const moviesSectionRef = useRef<HTMLDivElement>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const participantsRef = useRef<HTMLDivElement>(null);
  const closeParticipants = useCallback(() => setParticipantsOpen(false), []);
  useClickOutside(
    participantsRef,
    closeParticipants,
    participantsOpen,
    '[data-participants-toggle]'
  );
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

  useEffect(() => {
    if (addMovieOpen) {
      moviesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [addMovieOpen]);

  let selection: MovieCardSelection | undefined;
  if (wheel.manualMode) {
    selection = {
      active: true,
      mode: 'pick',
      pending: wheel.loading,
      selectableIds: wheel.drawableMovies.map((m) => m.id),
      onSelect: wheel.pickWinnerManually,
    };
  } else if (wheel.removalMode) {
    selection = {
      active: true,
      mode: 'remove',
      pending: wheel.loading,
      selectableIds: wheel.winnerIds,
      onSelect: wheel.removeWinner,
    };
  }

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
    handleLeaveEvent,
    requestResetWheel,
    requestCloseWithoutMovie,
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
  const shareUrl = eventFrontendUrl(slug);
  const needsJoin = !event.isFinished && !participant;
  const maxParticipants = event.config?.maxParticipants ?? null;
  const myParticipantSummary =
    participant && event.participants
      ? event.participants.find((p) => p.id === participant.participantId)
      : null;
  const isCreatorSelf = !!myParticipantSummary?.isCreator;
  const canShowLeave = !event.isFinished && !!participant && !isCreatorSelf;

  const participantCount = event.participantCount ?? event.participants?.length ?? 0;
  let moviesCount = event.movieCount ?? 0;
  if (moviesQuery.isSuccess) moviesCount = movies.length;
  const votersCount = event.votersCount ?? 0;
  const lifecycle = normalizeMyEventLifecycle(event.lifecycle);
  const countdown = eventCountdown(event.date, event.time, nowMs);
  const countdownLabel = countdown
    ? t(COUNTDOWN_KEYS[countdown.unit], countdownParams(countdown))
    : null;
  const canConfigure = !!event.isHost && !event.isFinished;
  const emptyStateCarriesAddMovie = moviesQuery.isSuccess && movies.length === 0;
  const canAddMovie = !event.isFinished && !!participant && !emptyStateCarriesAddMovie;
  const isFull =
    typeof maxParticipants === 'number' &&
    maxParticipants > 0 &&
    participantCount >= maxParticipants;

  return (
    <PageLayout className="page-event">
      <EventDetailSessionChrome
        slug={slug}
        hostToken={hostToken}
        event={event}
        moviesQuery={moviesQuery}
        setParticipant={setParticipant}
        shareUrl={shareUrl}
        dateFormatted={dateFormatted}
        timeFormatted={timeFormatted}
        dateLabel={dateLabel}
        lifecycle={lifecycle}
        countdownLabel={countdownLabel}
        participantCount={participantCount}
        moviesCount={moviesCount}
        votersCount={votersCount}
        participantsOpen={participantsOpen}
        onToggleParticipants={() => setParticipantsOpen((value) => !value)}
        onOpenShare={openShare}
        onOpenSettings={() => setSettingsOpen(true)}
        onAddMovie={() => setAddMovieOpen(true)}
        addMovieTriggerRef={addMovieTriggerRef}
        wheel={wheel}
        onRequestResetWheel={requestResetWheel}
        onRequestCloseWithoutMovie={requestCloseWithoutMovie}
        canConfigure={canConfigure}
        canAddMovie={canAddMovie}
        settingsOpen={settingsOpen}
        onCloseSettings={() => setSettingsOpen(false)}
        shareOpen={shareOpen}
        shareInitialTab={shareInitialTab}
        onCloseShare={() => setShareOpen(false)}
        needsJoin={!!needsJoin}
        isFull={isFull}
        maxParticipants={maxParticipants}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
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
        viewMode={viewMode}
        selection={selection}
        addMovieOpen={addMovieOpen}
        onAddMovieOpenChange={setAddMovieOpen}
        addMovieTriggerRef={addMovieTriggerRef}
        moviesSectionRef={moviesSectionRef}
        participantsOpen={participantsOpen}
        participantsRef={participantsRef}
        pendingRemovalId={pendingRemovalId}
        onRemoveParticipant={handleRemoveParticipant}
        onRequestRemoveMovie={handleRequestRemoveMovie}
        onInviteFriends={() => openShare('friends')}
        onLeave={handleLeaveEvent}
        canShowLeave={canShowLeave}
        isConnectedSelf={isConnectedSelf}
        removePending={removePending}
        actionSuccess={actionSuccess}
        wheel={wheel}
        isFull={isFull}
      />
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

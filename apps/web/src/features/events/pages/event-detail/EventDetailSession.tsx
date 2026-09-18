import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { ROUTES } from '@/app/routes';
import {
  formatMyEventsListDate,
  formatEventTime,
  formatEventDateLong,
} from '@/shared/utils/formatMyEventsListDate';
import JoinForm from '@/features/events/components/JoinForm';
import EventParticipantsList from '@/features/events/components/EventParticipantsList';
import EventDetailHeader from '@/features/events/pages/event-detail/EventDetailHeader';
import EventMoviesLoadError from '@/features/events/pages/event-detail/EventMoviesLoadError';
import EventMoviesSection from '@/features/events/pages/event-detail/EventMoviesSection';
import EventPendingBanner from '@/features/events/components/EventPendingBanner';
import EventClosedWithoutMovieState from '@/features/events/pages/event-detail/EventClosedWithoutMovieState';
import EventWinnerSummary from '@/features/events/pages/event-detail/EventWinnerSummary';
import PageLayout from '@/shared/components/PageLayout';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import {
  removeEventParticipant,
  eventFrontendUrl,
  getEligibleFollows,
  postEventClose,
} from '@/features/events/api/eventsApi';
import { removeMovieFromEvent } from '@/features/movies/api/moviesApi';
import { removeStoredParticipant } from '@/shared/utils/eventIdentityStorage';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import EventWheelActions from '@/features/events/components/EventWheelActions';
import { useEventWheel } from '@/features/events/hooks/useEventWheel';
import { eventCountdown, type EventCountdown } from '@/shared/utils/eventCountdown';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useEverOpened } from '@/shared/hooks/useEverOpened';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import styles from './EventDetailSession.module.css';
import { persistMoviesViewMode, readMoviesViewMode } from '@/features/events/moviesViewMode';

const loadWheelModal = () => import('@/features/events/components/WheelModal');
const loadHostEventSettingsPanel = () =>
  import('@/features/events/components/HostEventSettingsPanel');
const loadEventShareDialog = () => import('@/features/events/pages/event-detail/EventShareDialog');
const WheelModal = lazy(loadWheelModal);
const HostEventSettingsPanel = lazy(loadHostEventSettingsPanel);
const EventShareDialog = lazy(loadEventShareDialog);
const OVERLAY_CHUNKS = [loadWheelModal, loadHostEventSettingsPanel, loadEventShareDialog];

type ParticipantRef = { participantId: string; pseudo: string };

type ConfirmState =
  | { kind: 'remove'; participantId: string; pseudo: string }
  | { kind: 'leave' }
  | { kind: 'resetWheel' }
  | { kind: 'removeMovie'; movieId: string; movieTitle: string; voteCount: number }
  | { kind: 'closeWithoutMovie' }
  | null;

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

const SUCCESS_AUTO_DISMISS_MS = 3500;

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

type ConfirmBusyByKind = Record<NonNullable<ConfirmState>['kind'], boolean>;

type ConfirmDialogInputs = {
  confirmState: ConfirmState;
  t: ReturnType<typeof useTranslation>['t'];
  eventTitle: string;
  confirmRemove: (participantId: string, pseudo: string) => void;
  confirmLeave: () => void;
  confirmResetWheel: () => void;
  confirmRemoveMovie: (movieId: string) => void;
  confirmCloseWithoutMovie: () => void;
  busyByKind: ConfirmBusyByKind;
};

function buildConfirmDialogContent({
  confirmState,
  t,
  eventTitle,
  confirmRemove,
  confirmLeave,
  confirmResetWheel,
  confirmRemoveMovie,
  confirmCloseWithoutMovie,
  busyByKind,
}: ConfirmDialogInputs) {
  if (!confirmState) return null;
  const loading = busyByKind[confirmState.kind];
  if (confirmState.kind === 'remove') {
    return {
      title: t('events.participants.removeConfirmTitle'),
      message: t('events.participants.removeConfirm', { pseudo: confirmState.pseudo }),
      confirmLabel: t('events.participants.removeConfirmAction'),
      onConfirm: () => confirmRemove(confirmState.participantId, confirmState.pseudo),
      loading,
    };
  }
  if (confirmState.kind === 'resetWheel') {
    return {
      title: t('events.wheel.resetConfirmTitle'),
      message: t('events.wheel.resetConfirmMessage'),
      confirmLabel: t('events.wheel.resetConfirmAction'),
      onConfirm: confirmResetWheel,
      loading,
    };
  }
  if (confirmState.kind === 'removeMovie') {
    return {
      title: t('movies.list.removeConfirmTitle'),
      message: pluralizeCount(
        confirmState.voteCount,
        'movies.list.removeConfirmMessageOne',
        'movies.list.removeConfirmMessage',
        t,
        { title: confirmState.movieTitle }
      ),
      confirmLabel: t('movies.list.removeConfirmAction'),
      onConfirm: () => confirmRemoveMovie(confirmState.movieId),
      loading,
    };
  }
  if (confirmState.kind === 'closeWithoutMovie') {
    return {
      title: t('events.wheel.closeWithoutMovieConfirmTitle'),
      message: t('events.wheel.closeWithoutMovieConfirmMessage', { title: eventTitle }),
      confirmLabel: t('events.wheel.closeWithoutMovieConfirmAction'),
      onConfirm: confirmCloseWithoutMovie,
      loading,
    };
  }
  return {
    title: t('events.participants.leaveConfirmTitle'),
    message: t('events.participants.leaveConfirm'),
    confirmLabel: t('events.participants.leaveConfirmAction'),
    onConfirm: confirmLeave,
    loading,
  };
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { track } = useAnalytics();

  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  useIdlePrefetch(OVERLAY_CHUNKS);
  const [shareInitialTab, setShareInitialTab] = useState<'link' | 'friends'>('link');
  const openShare = useCallback((tab: 'link' | 'friends' = 'link') => {
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(readMoviesViewMode);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
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

  useEffect(() => {
    if (!actionSuccess) return;
    const id = globalThis.setTimeout(() => setActionSuccess(null), SUCCESS_AUTO_DISMISS_MS);
    return () => globalThis.clearTimeout(id);
  }, [actionSuccess]);

  const removeParticipantMutation = useMutation({
    mutationFn: (variables: { participantId: string }) =>
      removeEventParticipant(slug, variables.participantId, hostToken),
    onMutate: ({ participantId }) => {
      setPendingRemovalId(participantId);
    },
    onSettled: () => {
      setPendingRemovalId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
      queryClient.invalidateQueries({ queryKey: queryKeys.movies.list(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    },
  });

  const removeMovieMutation = useMutation({
    mutationFn: (movieId: string) => {
      if (!participant) return Promise.reject(new Error('No participant'));
      return removeMovieFromEvent(slug, movieId, participant.participantId, hostToken);
    },
  });

  const closeWithoutMovieMutation = useMutation({
    mutationFn: () => postEventClose(slug, hostToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
      refreshAll();
    },
    onError: (err) => {
      setActionError(getErrorMessage(err, t('events.wheel.closeError')));
    },
    onSettled: () => {
      setConfirmState(null);
    },
  });

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

  const handleRemoveParticipant = useCallback((participantId: string, pseudo: string) => {
    setConfirmState({ kind: 'remove', participantId, pseudo });
  }, []);

  const handleRequestRemoveMovie = useCallback((movie: MovieData) => {
    setConfirmState({
      kind: 'removeMovie',
      movieId: movie.id,
      movieTitle: movie.title,
      voteCount: movie.up + movie.down,
    });
  }, []);

  const handleLeaveEvent = useCallback(() => {
    if (!participant) return;
    setConfirmState({ kind: 'leave' });
  }, [participant]);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  const confirmRemove = useCallback(
    (participantId: string, pseudo: string) => {
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
    [removeParticipantMutation, setActionError, t]
  );

  const confirmRemoveMovie = useCallback(
    (movieId: string) => {
      if (!participant) return;
      setActionError(null);
      removeMovieMutation.mutate(movieId, {
        onSuccess: () => {
          track('movie_removed');
          refreshAll();
        },
        onError: (err) => {
          setActionError(getErrorMessage(err, t('movies.list.removeError')));
        },
        onSettled: () => {
          setConfirmState(null);
        },
      });
    },
    [participant, removeMovieMutation, setActionError, track, refreshAll, t]
  );

  const confirmLeave = useCallback(() => {
    if (!participant) return;
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

  const [resetWheelRequested, setResetWheelRequested] = useState(false);

  const confirmResetWheel = useCallback(() => {
    setResetWheelRequested(true);
    wheel.reset();
  }, [wheel]);

  useEffect(() => {
    if (resetWheelRequested && !wheel.loading) {
      setResetWheelRequested(false);
      setConfirmState(null);
    }
  }, [resetWheelRequested, wheel.loading]);

  const confirmCloseWithoutMovie = useCallback(() => {
    setActionError(null);
    closeWithoutMovieMutation.mutate();
  }, [closeWithoutMovieMutation, setActionError]);

  const confirmBusyByKind: ConfirmBusyByKind = useMemo(
    () => ({
      remove: removeParticipantMutation.isPending,
      leave: removeParticipantMutation.isPending,
      resetWheel: wheel.loading,
      removeMovie: removeMovieMutation.isPending,
      closeWithoutMovie: closeWithoutMovieMutation.isPending,
    }),
    [
      removeParticipantMutation.isPending,
      wheel.loading,
      removeMovieMutation.isPending,
      closeWithoutMovieMutation.isPending,
    ]
  );

  const confirmDialogContent = useMemo(
    () =>
      buildConfirmDialogContent({
        confirmState,
        t,
        eventTitle: event.title,
        confirmRemove,
        confirmLeave,
        confirmResetWheel,
        confirmRemoveMovie,
        confirmCloseWithoutMovie,
        busyByKind: confirmBusyByKind,
      }),
    [
      confirmState,
      t,
      event.title,
      confirmRemove,
      confirmLeave,
      confirmResetWheel,
      confirmRemoveMovie,
      confirmCloseWithoutMovie,
      confirmBusyByKind,
    ]
  );

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
        onRequestResetWheel={() => setConfirmState({ kind: 'resetWheel' })}
        onRequestCloseWithoutMovie={() => setConfirmState({ kind: 'closeWithoutMovie' })}
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
        removePending={removeParticipantMutation.isPending}
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

type WheelApi = ReturnType<typeof useEventWheel>;

function EventDetailSessionOverlays({
  slug,
  hostToken,
  event,
  canConfigure,
  settingsOpen,
  onCloseSettings,
  wheelError,
  shareOpen,
  shareInitialTab,
  onCloseShare,
  shareUrl,
  dateFormatted,
  timeFormatted,
  dateLabel,
  participantCount,
  moviesQuery,
  needsJoin,
  setParticipant,
  isFull,
  maxParticipants,
}: Readonly<{
  slug: string;
  hostToken: string | null;
  event: EventData;
  canConfigure: boolean;
  settingsOpen: boolean;
  onCloseSettings: () => void;
  wheelError: string | null;
  shareOpen: boolean;
  shareInitialTab: 'link' | 'friends';
  onCloseShare: () => void;
  shareUrl: string;
  dateFormatted: string;
  timeFormatted: string;
  dateLabel: string;
  participantCount: number;
  moviesQuery: UseQueryResult<MovieData[]>;
  needsJoin: boolean;
  setParticipant: Dispatch<SetStateAction<ParticipantRef | null>>;
  isFull: boolean;
  maxParticipants: number | null;
}>) {
  const { t } = useTranslation();
  const hostCanInvite = !!event.isHost && !event.isFinished;
  const eligibleFollowsQuery = useQuery({
    queryKey: queryKeys.event.eligibleFollows(slug),
    queryFn: () => getEligibleFollows(slug),
    enabled: hostCanInvite,
    staleTime: 30_000,
  });
  const participantsLabel = pluralizeCount(
    participantCount,
    'events.detail.participantsToggleOne',
    'events.detail.participantsToggle',
    t
  );

  const settingsEverOpened = useEverOpened(settingsOpen);
  const shareEverOpened = useEverOpened(shareOpen);

  return (
    <>
      {canConfigure && settingsEverOpened ? (
        <Suspense fallback={null}>
          <HostEventSettingsPanel
            slug={slug}
            hostToken={hostToken}
            event={event}
            open={settingsOpen}
            onClose={onCloseSettings}
          />
        </Suspense>
      ) : null}
      {wheelError ? (
        <p className="error" role="alert">
          {wheelError}
        </p>
      ) : null}
      {shareEverOpened ? (
        <Suspense fallback={null}>
          <EventShareDialog
            open={shareOpen}
            onClose={onCloseShare}
            slug={slug}
            event={event}
            shareUrl={shareUrl}
            dateFormatted={dateFormatted}
            timeFormatted={timeFormatted}
            dateLabel={dateLabel}
            participantsLabel={participantsLabel}
            initialTab={shareInitialTab}
            hostCanInvite={hostCanInvite}
            friendsBadge={eligibleFollowsQuery.data?.follows.length}
          />
        </Suspense>
      ) : null}
      {moviesQuery.isError ? (
        <EventMoviesLoadError error={moviesQuery.error} onRetry={() => moviesQuery.refetch()} />
      ) : null}
      {needsJoin ? (
        <JoinForm
          slug={slug}
          onJoined={(participantId, pseudo) => setParticipant({ participantId, pseudo })}
          isFull={isFull}
          maxParticipants={maxParticipants}
        />
      ) : null}
    </>
  );
}

function EventDetailSessionChrome({
  slug,
  hostToken,
  event,
  moviesQuery,
  setParticipant,
  shareUrl,
  dateFormatted,
  timeFormatted,
  dateLabel,
  lifecycle,
  countdownLabel,
  participantCount,
  moviesCount,
  votersCount,
  participantsOpen,
  onToggleParticipants,
  onOpenShare,
  onOpenSettings,
  onAddMovie,
  addMovieTriggerRef,
  wheel,
  onRequestResetWheel,
  onRequestCloseWithoutMovie,
  canConfigure,
  canAddMovie,
  settingsOpen,
  onCloseSettings,
  shareOpen,
  shareInitialTab,
  onCloseShare,
  needsJoin,
  isFull,
  maxParticipants,
  viewMode,
  onViewModeChange,
}: Readonly<{
  slug: string;
  hostToken: string | null;
  event: EventData;
  moviesQuery: UseQueryResult<MovieData[]>;
  setParticipant: Dispatch<SetStateAction<ParticipantRef | null>>;
  shareUrl: string;
  dateFormatted: string;
  timeFormatted: string;
  dateLabel: string;
  lifecycle: ReturnType<typeof normalizeMyEventLifecycle>;
  countdownLabel: string | null;
  participantCount: number;
  moviesCount: number;
  votersCount: number;
  participantsOpen: boolean;
  onToggleParticipants: () => void;
  onOpenShare: (tab?: 'link' | 'friends') => void;
  onOpenSettings: () => void;
  onAddMovie: () => void;
  addMovieTriggerRef: RefObject<HTMLButtonElement | null>;
  wheel: WheelApi;
  onRequestResetWheel: () => void;
  onRequestCloseWithoutMovie: () => void;
  canConfigure: boolean;
  canAddMovie: boolean;
  settingsOpen: boolean;
  onCloseSettings: () => void;
  shareOpen: boolean;
  shareInitialTab: 'link' | 'friends';
  onCloseShare: () => void;
  needsJoin: boolean;
  isFull: boolean;
  maxParticipants: number | null;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}>) {
  return (
    <>
      <EventDetailSessionHeader
        event={event}
        shareUrl={shareUrl}
        dateFormatted={dateFormatted}
        lifecycle={lifecycle}
        countdownLabel={countdownLabel}
        participantCount={participantCount}
        moviesCount={moviesCount}
        votersCount={votersCount}
        participantsOpen={participantsOpen}
        onToggleParticipants={onToggleParticipants}
        onOpenShare={onOpenShare}
        onOpenSettings={onOpenSettings}
        onAddMovie={onAddMovie}
        addMovieTriggerRef={addMovieTriggerRef}
        wheel={wheel}
        onRequestResetWheel={onRequestResetWheel}
        canConfigure={canConfigure}
        canAddMovie={canAddMovie}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      <EventPendingBannerGate
        lifecycle={lifecycle}
        event={event}
        wheel={wheel}
        canConfigure={canConfigure}
        onOpenSettings={onOpenSettings}
        onRequestCloseWithoutMovie={onRequestCloseWithoutMovie}
      />
      <EventDetailSessionOverlays
        slug={slug}
        hostToken={hostToken}
        event={event}
        canConfigure={canConfigure}
        settingsOpen={settingsOpen}
        onCloseSettings={onCloseSettings}
        wheelError={wheel.error}
        shareOpen={shareOpen}
        shareInitialTab={shareInitialTab}
        onCloseShare={onCloseShare}
        shareUrl={shareUrl}
        dateFormatted={dateFormatted}
        timeFormatted={timeFormatted}
        dateLabel={dateLabel}
        participantCount={participantCount}
        moviesQuery={moviesQuery}
        needsJoin={needsJoin}
        setParticipant={setParticipant}
        isFull={isFull}
        maxParticipants={maxParticipants}
      />
    </>
  );
}

function EventDetailSessionHeader({
  event,
  shareUrl,
  dateFormatted,
  lifecycle,
  countdownLabel,
  participantCount,
  moviesCount,
  votersCount,
  participantsOpen,
  onToggleParticipants,
  onOpenShare,
  onOpenSettings,
  onAddMovie,
  addMovieTriggerRef,
  wheel,
  onRequestResetWheel,
  canConfigure,
  canAddMovie,
  viewMode,
  onViewModeChange,
}: Readonly<{
  event: EventData;
  shareUrl: string;
  dateFormatted: string;
  lifecycle: ReturnType<typeof normalizeMyEventLifecycle>;
  countdownLabel: string | null;
  participantCount: number;
  moviesCount: number;
  votersCount: number;
  participantsOpen: boolean;
  onToggleParticipants: () => void;
  onOpenShare: (tab?: 'link' | 'friends') => void;
  onOpenSettings: () => void;
  onAddMovie: () => void;
  addMovieTriggerRef: RefObject<HTMLButtonElement | null>;
  wheel: WheelApi;
  onRequestResetWheel: () => void;
  canConfigure: boolean;
  canAddMovie: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}>) {
  return (
    <EventDetailHeader
      title={event.title}
      dateFormatted={dateFormatted}
      rawDate={event.date}
      rawTime={event.time}
      isFinished={!!event.isFinished}
      eventTheme={event.config?.theme}
      shareUrl={shareUrl}
      lifecycle={lifecycle}
      countdownLabel={countdownLabel}
      participants={event.participants}
      participantCount={participantCount}
      moviesCount={moviesCount}
      votersCount={votersCount}
      participantsOpen={participantsOpen}
      onToggleParticipants={onToggleParticipants}
      onOpenShare={shareUrl ? () => onOpenShare('link') : undefined}
      onOpenSettings={canConfigure ? onOpenSettings : undefined}
      wheelActions={<EventWheelActions wheel={wheel} onRequestReset={onRequestResetWheel} />}
      onAddMovie={canAddMovie ? onAddMovie : undefined}
      addMoviePrimary={wheel.primaryAction === 'add'}
      addMovieTriggerRef={addMovieTriggerRef}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
    />
  );
}

function EventPendingBannerGate({
  lifecycle,
  event,
  wheel,
  canConfigure,
  onOpenSettings,
  onRequestCloseWithoutMovie,
}: Readonly<{
  lifecycle: ReturnType<typeof normalizeMyEventLifecycle>;
  event: EventData;
  wheel: WheelApi;
  canConfigure: boolean;
  onOpenSettings: () => void;
  onRequestCloseWithoutMovie: () => void;
}>) {
  if (lifecycle !== 'pending') return null;
  return (
    <EventPendingBanner
      isHost={!!event.isHost}
      onLaunchWheel={wheel.canSpin && !wheel.spinDisabled ? wheel.launch : undefined}
      onReschedule={canConfigure ? onOpenSettings : undefined}
      onCloseWithoutMovie={canConfigure ? onRequestCloseWithoutMovie : undefined}
    />
  );
}

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

function EventDetailSessionBody({
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
  viewMode: 'grid' | 'list';
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

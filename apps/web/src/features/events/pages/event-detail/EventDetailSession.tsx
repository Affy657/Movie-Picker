import {
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
import { Film, Users } from 'lucide-react';
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
import EventMoviesLoadError from '@/features/events/pages/event-detail/EventMoviesLoadError';
import EventMoviesSection from '@/features/events/pages/event-detail/EventMoviesSection';
import EventPendingBanner from '@/features/events/components/EventPendingBanner';
import EventClosedWithoutMovieState from '@/features/events/pages/event-detail/EventClosedWithoutMovieState';
import PageLayout from '@/shared/components/PageLayout';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import {
  removeEventParticipant,
  eventFrontendUrl,
  getEligibleFollows,
} from '@/features/events/api/eventsApi';
import { removeMovieFromEvent } from '@/features/movies/api/moviesApi';
import { removeStoredParticipant } from '@/features/events/storage';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import ShareDialog from '@/shared/components/ShareDialog';
import EventInviteFriendsTab from '@/features/events/components/EventInviteFriendsTab';
import EventWheelActions from '@/features/events/components/EventWheelActions';
import { useEventWheel } from '@/features/events/hooks/useEventWheel';
import { eventCountdown, type EventCountdown } from '@/shared/utils/eventCountdown';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import { normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';

type ParticipantRef = { participantId: string; pseudo: string };

type ConfirmState =
  | { kind: 'remove'; participantId: string; pseudo: string }
  | { kind: 'leave' }
  | { kind: 'closeWithoutMovie' }
  | { kind: 'resetWheel' }
  | { kind: 'removeMovie'; movieId: string; movieTitle: string; voteCount: number }
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

function readMoviesViewMode(): 'grid' | 'list' {
  try {
    return localStorage.getItem('movies-view') === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

function persistMoviesViewMode(mode: 'grid' | 'list') {
  try {
    localStorage.setItem('movies-view', mode);
  } catch {
    return;
  }
}

function countdownParams(countdown: EventCountdown) {
  if (countdown.unit === 'imminent') return undefined;
  return { count: countdown.count };
}

type ConfirmBusyByKind = Record<NonNullable<ConfirmState>['kind'], boolean>;

function buildConfirmDialogContent(
  confirmState: ConfirmState,
  t: ReturnType<typeof useTranslation>['t'],
  eventTitle: string,
  confirmRemove: (participantId: string, pseudo: string) => void,
  confirmLeave: () => void,
  confirmCloseWithoutMovie: () => void,
  confirmResetWheel: () => void,
  confirmRemoveMovie: (movieId: string) => void,
  busyByKind: ConfirmBusyByKind
) {
  if (!confirmState) return null;
  const busy = busyByKind[confirmState.kind];
  if (confirmState.kind === 'remove') {
    return {
      title: t('events.participants.removeConfirmTitle'),
      message: t('events.participants.removeConfirm', { pseudo: confirmState.pseudo }),
      confirmLabel: t('events.participants.removeConfirmAction'),
      onConfirm: () => confirmRemove(confirmState.participantId, confirmState.pseudo),
      busy,
    };
  }
  if (confirmState.kind === 'closeWithoutMovie') {
    return {
      title: t('events.wheel.closeWithoutMovieConfirmTitle'),
      message: t('events.wheel.closeWithoutMovieConfirmMessage', { title: eventTitle }),
      confirmLabel: t('events.wheel.closeWithoutMovieConfirmAction'),
      onConfirm: confirmCloseWithoutMovie,
      busy,
    };
  }
  if (confirmState.kind === 'resetWheel') {
    return {
      title: t('events.wheel.resetConfirmTitle'),
      message: t('events.wheel.resetConfirmMessage'),
      confirmLabel: t('events.wheel.resetConfirmAction'),
      onConfirm: confirmResetWheel,
      busy,
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
      busy,
    };
  }
  return {
    title: t('events.participants.leaveConfirmTitle'),
    message: t('events.participants.leaveConfirm'),
    confirmLabel: t('events.participants.leaveConfirmAction'),
    onConfirm: confirmLeave,
    busy,
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
    if (!event.isHost || event.isFinished || event.winnerMovie) {
      setSettingsOpen(false);
    }
  }, [event.isHost, event.isFinished, event.winnerMovie]);

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

  const wheel = useEventWheel({
    slug,
    event,
    movies,
    hostToken,
    onWheelDone: refreshAll,
    onCloseDone: refreshAll,
  });

  useEffect(() => {
    if (wheel.manualMode) {
      moviesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [wheel.manualMode]);

  useEffect(() => {
    if (addMovieOpen) {
      moviesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [addMovieOpen]);

  const selection: MovieCardSelection | undefined = wheel.manualMode
    ? { active: true, pending: wheel.loading, onSelect: wheel.pickWinnerManually }
    : undefined;

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

  const [closeWithoutMovieRequested, setCloseWithoutMovieRequested] = useState(false);

  const confirmCloseWithoutMovie = useCallback(() => {
    setCloseWithoutMovieRequested(true);
    wheel.closeEvent();
  }, [wheel]);

  const [resetWheelRequested, setResetWheelRequested] = useState(false);

  const confirmResetWheel = useCallback(() => {
    setResetWheelRequested(true);
    wheel.reset();
  }, [wheel]);

  useEffect(() => {
    if (closeWithoutMovieRequested && !wheel.loading) {
      setCloseWithoutMovieRequested(false);
      setConfirmState(null);
    }
  }, [closeWithoutMovieRequested, wheel.loading]);

  useEffect(() => {
    if (resetWheelRequested && !wheel.loading) {
      setResetWheelRequested(false);
      setConfirmState(null);
    }
  }, [resetWheelRequested, wheel.loading]);

  const confirmBusyByKind: ConfirmBusyByKind = useMemo(
    () => ({
      remove: removeParticipantMutation.isPending,
      leave: removeParticipantMutation.isPending,
      closeWithoutMovie: wheel.loading,
      resetWheel: wheel.loading,
      removeMovie: removeMovieMutation.isPending,
    }),
    [removeParticipantMutation.isPending, wheel.loading, removeMovieMutation.isPending]
  );

  const confirmDialogContent = useMemo(
    () =>
      buildConfirmDialogContent(
        confirmState,
        t,
        event.title,
        confirmRemove,
        confirmLeave,
        confirmCloseWithoutMovie,
        confirmResetWheel,
        confirmRemoveMovie,
        confirmBusyByKind
      ),
    [
      confirmState,
      t,
      confirmRemove,
      confirmLeave,
      confirmCloseWithoutMovie,
      confirmResetWheel,
      confirmRemoveMovie,
      event.title,
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
  const showContent = event.isFinished || participant;
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
  const canConfigure = !!event.isHost && !event.isFinished && !event.winnerMovie;
  const canAddMovie = !event.isFinished && !!participant;
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
        showContent={!!showContent}
        wheel={wheel}
        onRequestCloseWithoutMovie={() => setConfirmState({ kind: 'closeWithoutMovie' })}
        onRequestResetWheel={() => setConfirmState({ kind: 'resetWheel' })}
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
      {showContent ? (
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
          onViewModeChange={handleViewModeChange}
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
        />
      ) : null}
      <ConfirmDialog
        open={confirmDialogContent !== null}
        title={confirmDialogContent?.title ?? ''}
        message={confirmDialogContent?.message ?? ''}
        confirmLabel={confirmDialogContent?.confirmLabel ?? ''}
        confirmVariant="danger"
        busy={confirmDialogContent?.busy ?? false}
        onConfirm={confirmDialogContent?.onConfirm ?? closeConfirm}
        onCancel={closeConfirm}
      />
    </PageLayout>
  );
}

type WheelApi = ReturnType<typeof useEventWheel>;

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
  showContent,
  wheel,
  onRequestCloseWithoutMovie,
  onRequestResetWheel,
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
  showContent: boolean;
  wheel: WheelApi;
  onRequestCloseWithoutMovie: () => void;
  onRequestResetWheel: () => void;
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
  return (
    <>
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
        wheelActions={
          showContent ? (
            <EventWheelActions
              wheel={wheel}
              onRequestCloseWithoutMovie={onRequestCloseWithoutMovie}
              onRequestReset={onRequestResetWheel}
            />
          ) : null
        }
        onAddMovie={canAddMovie ? onAddMovie : undefined}
        addMoviePrimary={!wheel.winner}
        addMovieTriggerRef={addMovieTriggerRef}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      {lifecycle === 'pending' ? <EventPendingBanner isHost={!!event.isHost} /> : null}
      {canConfigure ? (
        <HostEventSettingsPanel
          slug={slug}
          hostToken={hostToken}
          event={event}
          open={settingsOpen}
          onClose={onCloseSettings}
        />
      ) : null}
      {wheel.error ? (
        <p className="error" role="alert">
          {wheel.error}
        </p>
      ) : null}
      <ShareDialog
        open={shareOpen}
        onClose={onCloseShare}
        title={t('events.share.dialogTitle')}
        url={shareUrl}
        qrHint={t('events.share.qrHint')}
        fileSlug={slug}
        preview={{
          icon: <Film size={20} aria-hidden />,
          name: event.title,
          meta: [dateFormatted, participantsLabel],
        }}
        shareText={t('events.share.shareText', {
          title: event.title,
          time: timeFormatted,
          date: dateLabel,
        })}
        surface="event"
        initialTab={shareInitialTab}
        extraTab={
          hostCanInvite
            ? {
                id: 'friends',
                label: t('share.tabFriends'),
                icon: <Users size={15} aria-hidden />,
                badge: eligibleFollowsQuery.data?.follows.length,
                content: <EventInviteFriendsTab slug={slug} onNavigate={onCloseShare} />,
              }
            : undefined
        }
      />
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
  onViewModeChange,
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
  onViewModeChange: (mode: 'grid' | 'list') => void;
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
}>) {
  const hostCanInvite = !!event.isHost && !event.isFinished;
  return (
    <>
      {participantsOpen ? (
        <div ref={participantsRef}>
          <EventParticipantsList
            participants={event.participants}
            currentParticipantId={participant?.participantId ?? null}
            maxParticipants={event.config?.maxParticipants ?? null}
            isHost={!!event.isHost}
            pendingRemovalId={pendingRemovalId}
            onRemoveParticipant={event.isFinished ? undefined : onRemoveParticipant}
            onInvite={hostCanInvite ? onInviteFriends : undefined}
            onLeave={canShowLeave ? onLeave : undefined}
            leaveDisabled={
              isConnectedSelf && removePending && pendingRemovalId === participant?.participantId
            }
          />
        </div>
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
      <WheelSection movies={movies} wheel={wheel} />
      <div ref={moviesSectionRef}>
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
          onViewModeChange={onViewModeChange}
          selection={selection}
          addMovieOpen={addMovieOpen}
          onAddMovieOpenChange={onAddMovieOpenChange}
          addMovieTriggerRef={addMovieTriggerRef}
          winnerMovieId={wheel.winner?.id}
        />
      </div>
      {event.isFinished && !event.winnerMovie ? (
        <EventClosedWithoutMovieState isHost={!!event.isHost} />
      ) : null}
    </>
  );
}

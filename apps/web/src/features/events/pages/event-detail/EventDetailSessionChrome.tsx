import { Suspense, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import JoinForm from '@/features/events/components/JoinForm';
import EventDetailHeader from '@/features/events/pages/event-detail/EventDetailHeader';
import EventMoviesLoadError from '@/features/events/pages/event-detail/EventMoviesLoadError';
import EventPendingBanner from '@/features/events/components/EventPendingBanner';
import EventWheelActions from '@/features/events/components/EventWheelActions';
import { getEligibleFollows } from '@/features/events/api/eventsApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useEverOpened } from '@/shared/hooks/useEverOpened';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import type { MyEventLifecycle } from '@/shared/types/event';
import { EventShareDialog, HostEventSettingsPanel } from './eventDetailOverlays';
import type { MoviesViewMode, ParticipantRef, ShareTab, WheelApi } from './eventDetailSessionTypes';

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
  shareInitialTab: ShareTab;
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

export default function EventDetailSessionChrome({
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
  lifecycle: MyEventLifecycle;
  countdownLabel: string | null;
  participantCount: number;
  moviesCount: number;
  votersCount: number;
  participantsOpen: boolean;
  onToggleParticipants: () => void;
  onOpenShare: (tab?: ShareTab) => void;
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
  shareInitialTab: ShareTab;
  onCloseShare: () => void;
  needsJoin: boolean;
  isFull: boolean;
  maxParticipants: number | null;
  viewMode: MoviesViewMode;
  onViewModeChange: (mode: MoviesViewMode) => void;
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
  lifecycle: MyEventLifecycle;
  countdownLabel: string | null;
  participantCount: number;
  moviesCount: number;
  votersCount: number;
  participantsOpen: boolean;
  onToggleParticipants: () => void;
  onOpenShare: (tab?: ShareTab) => void;
  onOpenSettings: () => void;
  onAddMovie: () => void;
  addMovieTriggerRef: RefObject<HTMLButtonElement | null>;
  wheel: WheelApi;
  onRequestResetWheel: () => void;
  canConfigure: boolean;
  canAddMovie: boolean;
  viewMode: MoviesViewMode;
  onViewModeChange: (mode: MoviesViewMode) => void;
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
  lifecycle: MyEventLifecycle;
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

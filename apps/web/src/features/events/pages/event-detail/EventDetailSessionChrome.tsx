import { Suspense } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import JoinForm from '@/features/events/components/JoinForm';
import EventDetailHeader from '@/features/events/pages/event-detail/EventDetailHeader';
import EventMoviesLoadError from '@/features/events/pages/event-detail/EventMoviesLoadError';
import EventPendingBanner from '@/features/events/components/EventPendingBanner';
import EventConnectionBanner from '@/features/events/components/EventConnectionBanner';
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
import type {
  AddMovieEntry,
  EventCounts,
  EventDateLabels,
  JoinGate,
  MoviesViewMode,
  ParticipantsToggle,
  SettingsOverlay,
  ShareOverlay,
  WheelApi,
} from './eventDetailSessionTypes';

function EventDetailSessionOverlays({
  slug,
  hostToken,
  event,
  settings,
  share,
  dates,
  participantCount,
  moviesQuery,
  join,
  wheelError,
}: Readonly<{
  slug: string;
  hostToken: string | null;
  event: EventData;
  settings: SettingsOverlay;
  share: ShareOverlay;
  dates: EventDateLabels;
  participantCount: number;
  moviesQuery: UseQueryResult<MovieData[]>;
  join: JoinGate;
  wheelError: string | null;
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

  const settingsEverOpened = useEverOpened(settings.open);
  const shareEverOpened = useEverOpened(share.open);

  return (
    <>
      {settings.canConfigure && settingsEverOpened ? (
        <Suspense fallback={null}>
          <HostEventSettingsPanel
            slug={slug}
            hostToken={hostToken}
            event={event}
            open={settings.open}
            onClose={settings.onClose}
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
            open={share.open}
            onClose={share.onClose}
            slug={slug}
            event={event}
            shareUrl={share.url}
            dateFormatted={dates.dateFormatted}
            timeFormatted={dates.timeFormatted}
            dateLabel={dates.dateLabel}
            participantsLabel={participantsLabel}
            initialTab={share.initialTab}
            hostCanInvite={hostCanInvite}
            friendsBadge={eligibleFollowsQuery.data?.follows.length}
          />
        </Suspense>
      ) : null}
      {moviesQuery.isError && moviesQuery.data === undefined ? (
        <EventMoviesLoadError error={moviesQuery.error} onRetry={() => moviesQuery.refetch()} />
      ) : null}
      {join.needsJoin ? (
        <JoinForm
          slug={slug}
          onJoined={(participantId, pseudo) => join.setParticipant({ participantId, pseudo })}
          isFull={join.isFull}
          maxParticipants={join.maxParticipants}
        />
      ) : null}
    </>
  );
}

function SessionPendingBanner({
  isHost,
  wheel,
  settings,
  onRequestCloseWithoutMovie,
}: Readonly<{
  isHost: boolean;
  wheel: WheelApi;
  settings: SettingsOverlay;
  onRequestCloseWithoutMovie: () => void;
}>) {
  const canLaunch = wheel.canSpin && !wheel.spinDisabled;
  return (
    <EventPendingBanner
      isHost={isHost}
      onLaunchWheel={canLaunch ? wheel.launch : undefined}
      onReschedule={settings.canConfigure ? settings.onOpen : undefined}
      onCloseWithoutMovie={settings.canConfigure ? onRequestCloseWithoutMovie : undefined}
    />
  );
}

export default function EventDetailSessionChrome({
  slug,
  hostToken,
  event,
  moviesQuery,
  lifecycle,
  countdownLabel,
  counts,
  dates,
  share,
  settings,
  participants,
  addMovie,
  join,
  wheel,
  onRequestResetWheel,
  onRequestCloseWithoutMovie,
  viewMode,
  onViewModeChange,
  connectionUnstable,
  onRetryConnection,
}: Readonly<{
  slug: string;
  hostToken: string | null;
  event: EventData;
  moviesQuery: UseQueryResult<MovieData[]>;
  lifecycle: MyEventLifecycle;
  countdownLabel: string | null;
  counts: EventCounts;
  dates: EventDateLabels;
  share: ShareOverlay;
  settings: SettingsOverlay;
  participants: ParticipantsToggle;
  addMovie: AddMovieEntry;
  join: JoinGate;
  wheel: WheelApi;
  onRequestResetWheel: () => void;
  onRequestCloseWithoutMovie: () => void;
  viewMode: MoviesViewMode;
  onViewModeChange: (mode: MoviesViewMode) => void;
  connectionUnstable: boolean;
  onRetryConnection: () => void;
}>) {
  return (
    <>
      <EventDetailHeader
        title={event.title}
        dateFormatted={dates.dateFormatted}
        rawDate={event.date}
        rawTime={event.time}
        isFinished={!!event.isFinished}
        eventTheme={event.config?.theme}
        shareUrl={share.url}
        lifecycle={lifecycle}
        countdownLabel={countdownLabel}
        participants={event.participants}
        participantCount={counts.participants}
        moviesCount={counts.movies}
        votersCount={counts.voters}
        participantsOpen={participants.open}
        onToggleParticipants={participants.onToggle}
        onOpenShare={share.url ? () => share.onOpen('link') : undefined}
        onOpenSettings={settings.canConfigure ? settings.onOpen : undefined}
        wheelActions={<EventWheelActions wheel={wheel} onRequestReset={onRequestResetWheel} />}
        onAddMovie={addMovie.canAdd ? addMovie.onOpen : undefined}
        addMoviePrimary={wheel.primaryAction === 'add'}
        addMovieTriggerRef={addMovie.triggerRef}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      {connectionUnstable ? <EventConnectionBanner onRetry={onRetryConnection} /> : null}
      {lifecycle === 'pending' ? (
        <SessionPendingBanner
          isHost={!!event.isHost}
          wheel={wheel}
          settings={settings}
          onRequestCloseWithoutMovie={onRequestCloseWithoutMovie}
        />
      ) : null}
      <EventDetailSessionOverlays
        slug={slug}
        hostToken={hostToken}
        event={event}
        settings={settings}
        share={share}
        dates={dates}
        participantCount={counts.participants}
        moviesQuery={moviesQuery}
        join={join}
        wheelError={wheel.error}
      />
    </>
  );
}

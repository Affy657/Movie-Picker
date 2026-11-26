import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { AlertCircle, CalendarX2 } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import EventDetailSkeleton from '@/features/events/pages/event-detail/EventDetailSkeleton';
import { friendlyEventError } from '@/features/events/pages/event-detail/friendlyEventError';
import { APP_DOCUMENT_TITLE, pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import PageLayout from '@/shared/components/PageLayout';
import ErrorState from '@/shared/components/ErrorState';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';
import { useJoinIntent } from '@/features/events/hooks/useJoinIntent';
import { JoinedAnnouncementContext, useJoinedNotice } from '@/features/events/joinedAnnouncement';
import JoinedNotice from '@/features/events/components/JoinedNotice';
import { isWellFormedEventSlug } from '@/features/events/utils/eventSlug';
import EventDetailSession from '@/features/events/pages/event-detail/EventDetailSession';
import Button, { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ApiError } from '@/shared/api/apiError';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

type PageState = {
  isPending: boolean;
  isNotFound: boolean;
  isError: boolean;
  isOffline: boolean;
};

function getDocumentTitle(
  slug: string | undefined,
  state: PageState,
  eventTitle: string | undefined,
  t: (key: TranslationKey) => string
): string {
  if (!slug) return APP_DOCUMENT_TITLE;
  if (state.isPending) return pageTitle(t('events.detail.loading'));
  if (state.isOffline) return pageTitle(t('events.detail.errorOffline'));
  if (state.isNotFound) return pageTitle(t('events.detail.notFoundTitle'));
  if (state.isError) return pageTitle(t('events.detail.errorFallback'));
  if (eventTitle) return pageTitle(eventTitle);
  return APP_DOCUMENT_TITLE;
}

function eventUnavailableMessage(
  state: { isNetworkPaused: boolean; error: unknown },
  t: (key: TranslationKey) => string
): string {
  if (state.isNetworkPaused) return t('errors.network');
  return friendlyEventError(state.error, {
    notFound: t('events.detail.missing'),
    fallback: t('errors.generic'),
  });
}

function EventNotFoundState() {
  const { t } = useTranslation();
  return (
    <ErrorState
      icon={<CalendarX2 size={ICON_SIZE['4xl']} />}
      title={t('events.detail.notFoundTitle')}
      message={t('events.detail.missing')}
      actions={
        <Link to={ROUTES.home} className={buttonClass({ variant: 'primary' })}>
          {t('errors.backHome')}
        </Link>
      }
    />
  );
}

function EventUnavailableState({
  message,
  retrying,
  onRetry,
}: Readonly<{ message: string; retrying: boolean; onRetry: () => void }>) {
  const { t } = useTranslation();
  return (
    <PageLayout className="page-event page--centered page--errorState">
      <span className="errorStateIcon" aria-hidden>
        <AlertCircle size={ICON_SIZE['4xl']} />
      </span>
      <p className="errorStateMessage" role="alert">
        {message}
      </p>
      <Button type="button" variant="primary" loading={retrying} onClick={onRetry}>
        {t('common.retry')}
      </Button>
      <Link to={ROUTES.home} className={buttonClass()}>
        {t('events.detail.backHome')}
      </Link>
    </PageLayout>
  );
}

type ArrivalState = { configNotSaved?: boolean; openPropose?: boolean } | null;

const ARRIVAL_FLAGS = new Set(['configNotSaved', 'openPropose']);

function withoutArrivalFlags(state: object): object | null {
  const kept = Object.entries(state).filter(([key]) => !ARRIVAL_FLAGS.has(key));
  return kept.length > 0 ? Object.fromEntries(kept) : null;
}

function useArrivalOnce(): ArrivalState {
  const location = useLocation();
  const navigate = useNavigate();
  const [arrival] = useState(() => location.state as ArrivalState);
  const { pathname, search, hash, state } = location;

  useEffect(() => {
    if (state === null || typeof state !== 'object') return;
    if (!Object.keys(state).some((key) => ARRIVAL_FLAGS.has(key))) return;
    void navigate({ pathname, search, hash }, { replace: true, state: withoutArrivalFlags(state) });
  }, [pathname, search, hash, state, navigate]);

  return arrival;
}

export default function EventDetail() {
  const { t } = useTranslation();
  const { slug: slugParam } = useParams<{ slug: string }>();
  const isMalformedSlug = slugParam !== undefined && !isWellFormedEventSlug(slugParam);
  const slug = isMalformedSlug ? undefined : slugParam;
  const arrival = useArrivalOnce();
  const {
    eventQuery,
    event,
    moviesQuery,
    movies,
    participant,
    setParticipant,
    actionError,
    setActionError,
    refreshAll,
    livePresence,
    showingOfflineCopy,
    offlineVoteOutcome,
    dismissOfflineVoteOutcome,
  } = useEventDetailPage(slug, arrival?.configNotSaved ? t('events.create.configNotSaved') : null);

  const online = useOnlineStatus();
  const offline = !online || showingOfflineCopy;
  const joinedNotice = useJoinedNotice();
  useJoinIntent({
    slug,
    event,
    participant,
    setParticipant,
    eventSettled: !eventQuery.isFetching,
    offline,
    onJoined: joinedNotice.show,
    onError: setActionError,
  });
  const isNetworkPaused = eventQuery.isPending && eventQuery.fetchStatus === 'paused';
  const isLoadingEvent = !isMalformedSlug && eventQuery.isPending && !isNetworkPaused;
  const isEventGone = ApiError.is(eventQuery.error) && eventQuery.error.code === 404;
  const isEventNotFound = isMalformedSlug || isEventGone;
  const isEventUnavailable = (eventQuery.isError && !event) || isNetworkPaused;
  const isShowingStaleData =
    eventQuery.isError || (moviesQuery.isError && moviesQuery.data !== undefined);

  const documentTitle = getDocumentTitle(
    slugParam,
    {
      isPending: isLoadingEvent,
      isNotFound: isEventNotFound,
      isError: isEventUnavailable,
      isOffline: isNetworkPaused,
    },
    event?.title,
    t
  );
  usePageSeo({
    title: documentTitle,
    noindex: true,
    canonical: slug ? absoluteUrl(ROUTES.eventDetail(slug)) : undefined,
  });

  if (!slugParam) return null;

  if (isLoadingEvent) {
    return (
      <PageLayout className="page-event">
        <EventDetailSkeleton />
      </PageLayout>
    );
  }

  if (isEventNotFound) return <EventNotFoundState />;

  if (isEventUnavailable) {
    return (
      <EventUnavailableState
        message={eventUnavailableMessage({ isNetworkPaused, error: eventQuery.error }, t)}
        retrying={eventQuery.isFetching}
        onRetry={() => void eventQuery.refetch()}
      />
    );
  }

  if (!event || !slug) return null;

  return (
    <JoinedAnnouncementContext value={joinedNotice.show}>
      <EventDetailSession
        slug={slug}
        event={event}
        moviesQuery={moviesQuery}
        movies={movies}
        participant={participant}
        setParticipant={setParticipant}
        actionError={actionError}
        setActionError={setActionError}
        refreshAll={refreshAll}
        connectionUnstable={isShowingStaleData}
        proposeOnArrival={arrival?.openPropose === true}
        livePresence={livePresence}
        offline={offline}
        offlineVoteOutcome={offlineVoteOutcome}
        onDismissOfflineVoteOutcome={dismissOfflineVoteOutcome}
      />
      {joinedNotice.shown ? <JoinedNotice onClose={joinedNotice.dismiss} /> : null}
    </JoinedAnnouncementContext>
  );
}

import { Link, useLocation, useParams } from 'react-router';
import { AlertCircle } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import EventDetailSkeleton from '@/features/events/pages/event-detail/EventDetailSkeleton';
import { friendlyEventError } from '@/features/events/pages/event-detail/friendlyEventError';
import { APP_DOCUMENT_TITLE, pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import PageLayout from '@/shared/components/PageLayout';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';
import { isWellFormedEventSlug } from '@/features/events/utils/eventSlug';
import EventDetailSession from '@/features/events/pages/event-detail/EventDetailSession';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';

function getDocumentTitle(
  slug: string | undefined,
  isPending: boolean,
  isError: boolean,
  isOffline: boolean,
  eventTitle: string | undefined,
  t: (key: TranslationKey) => string
): string {
  if (!slug) return APP_DOCUMENT_TITLE;
  if (isPending) return pageTitle(t('events.detail.loading'));
  if (isOffline) return pageTitle(t('events.detail.errorOffline'));
  if (isError) return pageTitle(t('events.detail.errorFallback'));
  if (eventTitle) return pageTitle(eventTitle);
  return APP_DOCUMENT_TITLE;
}

function eventUnavailableMessage(
  state: { isNetworkPaused: boolean; isMalformedSlug: boolean; error: unknown },
  t: (key: TranslationKey) => string
): string {
  if (state.isNetworkPaused) return t('errors.network');
  if (state.isMalformedSlug) return t('events.detail.missing');
  return friendlyEventError(state.error, {
    notFound: t('events.detail.missing'),
    fallback: t('errors.generic'),
  });
}

type ArrivalState = { configNotSaved?: boolean } | null;

export default function EventDetail() {
  const { t } = useTranslation();
  const { slug: slugParam } = useParams<{ slug: string }>();
  const isMalformedSlug = slugParam !== undefined && !isWellFormedEventSlug(slugParam);
  const slug = isMalformedSlug ? undefined : slugParam;
  const arrival = useLocation().state as ArrivalState;
  const {
    hostToken,
    eventQuery,
    event,
    moviesQuery,
    movies,
    participant,
    setParticipant,
    actionError,
    setActionError,
    refreshAll,
  } = useEventDetailPage(slug, arrival?.configNotSaved ? t('events.create.configNotSaved') : null);

  const isNetworkPaused = eventQuery.isPending && eventQuery.fetchStatus === 'paused';
  const isLoadingEvent = !isMalformedSlug && eventQuery.isPending && !isNetworkPaused;
  const isEventUnavailable = isMalformedSlug || eventQuery.isError || isNetworkPaused;

  const documentTitle = getDocumentTitle(
    slugParam,
    isLoadingEvent,
    isEventUnavailable,
    isNetworkPaused,
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

  if (isEventUnavailable) {
    return (
      <PageLayout className="page-event page--centered page--errorState">
        <span className="errorStateIcon" aria-hidden>
          <AlertCircle size={ICON_SIZE['4xl']} />
        </span>
        <p className="errorStateMessage" role="alert">
          {eventUnavailableMessage(
            { isNetworkPaused, isMalformedSlug, error: eventQuery.error },
            t
          )}
        </p>
        <Link to={ROUTES.home} className={buttonClass()}>
          {t('events.detail.backHome')}
        </Link>
      </PageLayout>
    );
  }

  if (!event || !slug) return null;

  return (
    <EventDetailSession
      slug={slug}
      hostToken={hostToken}
      event={event}
      moviesQuery={moviesQuery}
      movies={movies}
      participant={participant}
      setParticipant={setParticipant}
      actionError={actionError}
      setActionError={setActionError}
      refreshAll={refreshAll}
    />
  );
}

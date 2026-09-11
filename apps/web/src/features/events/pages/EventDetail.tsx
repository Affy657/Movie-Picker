import { Link, useParams } from 'react-router';
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
import EventDetailSession from '@/features/events/pages/event-detail/EventDetailSession';
import { buttonClass } from '@/shared/components/Button';

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

export default function EventDetail() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
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
  } = useEventDetailPage(slug);

  const isNetworkPaused = eventQuery.isPending && eventQuery.fetchStatus === 'paused';
  const isLoadingEvent = eventQuery.isPending && !isNetworkPaused;
  const isEventUnavailable = eventQuery.isError || isNetworkPaused;

  const documentTitle = getDocumentTitle(
    slug,
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

  if (!slug) return null;

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
          <AlertCircle size={32} />
        </span>
        <p className="errorStateMessage" role="alert">
          {isNetworkPaused
            ? t('errors.network')
            : friendlyEventError(eventQuery.error, {
                notFound: t('events.detail.missing'),
                fallback: t('errors.generic'),
              })}
        </p>
        <Link to={ROUTES.home} className={buttonClass()}>
          {t('events.detail.backHome')}
        </Link>
      </PageLayout>
    );
  }

  if (!event) return null;

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

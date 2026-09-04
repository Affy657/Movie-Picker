import { Link, useParams } from 'react-router';
import { AlertCircle } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import EventDetailSkeleton from '@/features/events/pages/event-detail/EventDetailSkeleton';
import { friendlyEventError } from '@/features/events/pages/event-detail/friendlyEventError';
import { APP_DOCUMENT_TITLE, pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import PageLayout from '@/shared/components/PageLayout';
import { useEventDetailPage } from '@/features/events/hooks/useEventDetailPage';
import EventDetailSession from '@/features/events/pages/event-detail/EventDetailSession';

function getDocumentTitle(
  slug: string | undefined,
  isPending: boolean,
  isError: boolean,
  eventTitle: string | undefined
): string {
  if (!slug) return APP_DOCUMENT_TITLE;
  if (isPending) return pageTitle('Chargement');
  if (isError) return pageTitle('Soirée introuvable');
  if (eventTitle) return pageTitle(eventTitle);
  return APP_DOCUMENT_TITLE;
}

export default function EventDetail() {
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

  const documentTitle = getDocumentTitle(
    slug,
    eventQuery.isPending,
    eventQuery.isError,
    event?.title
  );
  usePageSeo({
    title: documentTitle,
    noindex: true,
    canonical: slug ? absoluteUrl(ROUTES.eventDetail(slug)) : undefined,
  });

  if (!slug) return null;

  if (eventQuery.isPending) {
    return (
      <PageLayout className="page-event">
        <EventDetailSkeleton />
      </PageLayout>
    );
  }

  if (eventQuery.isError) {
    const errorMessage = friendlyEventError(eventQuery.error);
    return (
      <PageLayout className="page-event page--centered page--errorState">
        <span className="errorStateIcon" aria-hidden>
          <AlertCircle size={32} />
        </span>
        <p className="errorStateMessage" role="alert">
          {errorMessage}
        </p>
        <Link to={ROUTES.discover} className="btn">
          Retour à l&apos;accueil
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

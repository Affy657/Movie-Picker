import { useMemo } from 'react';
import { useParams } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { ApiError } from '@/shared/api/apiError';
import { APP_DOCUMENT_TITLE, pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { useEvent } from '@/features/events/hooks/useEvent';
import { useMovies } from '@/features/movies/hooks/useMovies';
import type { MovieData } from '@/shared/types/movie';
import NightRecapHeader from './night-recap/NightRecapHeader';
import NightRecapFilms from './night-recap/NightRecapFilms';
import NightRecapCta from './night-recap/NightRecapCta';
import {
  NightRecapLoadError,
  NightRecapNotFound,
  NightRecapSkeleton,
  NightRecapWaiting,
} from './night-recap/NightRecapStates';

function isNotFound(error: unknown): boolean {
  return ApiError.is(error) && error.code === 404;
}

export default function NightRecapPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const eventQuery = useEvent(slug, null, { live: false });
  const event = eventQuery.data ?? null;
  const winnerIds = useMemo(() => event?.winners?.map((w) => w.movieId) ?? [], [event]);
  const moviesQuery = useMovies(slug, {
    enabled: winnerIds.length > 0,
    participantId: event?.myParticipant?.id ?? null,
  });
  const winners = useMemo(
    () =>
      winnerIds
        .map((id) => moviesQuery.data?.find((movie) => movie.id === id))
        .filter((movie): movie is MovieData => movie !== undefined),
    [winnerIds, moviesQuery.data]
  );

  usePageSeo({
    title: event
      ? pageTitle(t('events.recap.documentTitle', { title: event.title }))
      : APP_DOCUMENT_TITLE,
    noindex: true,
    canonical: slug ? absoluteUrl(ROUTES.nightRecap(slug)) : undefined,
  });

  if (!slug) return null;
  if (eventQuery.isPending) return <NightRecapSkeleton />;
  if (eventQuery.isError) {
    if (isNotFound(eventQuery.error)) return <NightRecapNotFound />;
    return <NightRecapLoadError onRetry={() => void eventQuery.refetch()} />;
  }
  if (!event) return null;
  if (winnerIds.length === 0) {
    return <NightRecapWaiting slug={slug} title={event.title} finished={!!event.isFinished} />;
  }
  if (moviesQuery.isError) {
    return <NightRecapLoadError onRetry={() => void moviesQuery.refetch()} />;
  }
  if (moviesQuery.isPending) return <NightRecapSkeleton />;

  return (
    <PageLayout>
      <NightRecapHeader event={event} winners={winners} />
      <NightRecapFilms event={event} winners={winners} />
      <NightRecapCta slug={slug} />
    </PageLayout>
  );
}

import { useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import PageLayout from '@/shared/components/PageLayout';
import { ROUTES } from '@/app/routes';
import { ApiError } from '@/shared/api/apiError';
import { APP_DOCUMENT_TITLE, pageTitle } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { useNightRecap } from '@/features/events/hooks/useNightRecap';
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

function useRecapViewCount(slug: string | undefined, winnerCount: number): void {
  const { track } = useAnalytics();
  const countedSlug = useRef<string | null>(null);
  useEffect(() => {
    if (!slug || winnerCount === 0 || countedSlug.current === slug) return;
    countedSlug.current = slug;
    track('recap_viewed', { winners: winnerCount });
  }, [slug, winnerCount, track]);
}

export default function NightRecapPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const recapQuery = useNightRecap(slug);
  const recap = recapQuery.data ?? null;
  useRecapViewCount(slug, recap?.winners.length ?? 0);

  usePageSeo({
    title: recap
      ? pageTitle(t('events.recap.documentTitle', { title: recap.event.title }))
      : APP_DOCUMENT_TITLE,
    noindex: true,
    canonical: slug ? absoluteUrl(ROUTES.nightRecap(slug)) : undefined,
  });

  if (!slug) return null;
  if (recapQuery.isPending) return <NightRecapSkeleton />;
  if (recapQuery.isError) {
    if (isNotFound(recapQuery.error)) return <NightRecapNotFound />;
    return <NightRecapLoadError onRetry={() => void recapQuery.refetch()} />;
  }
  if (!recap) return null;
  const { event, winners, eventSlug } = recap;
  if (winners.length === 0) {
    return (
      <NightRecapWaiting eventSlug={eventSlug} title={event.title} finished={!!event.isFinished} />
    );
  }

  return (
    <PageLayout className="page-event">
      <NightRecapHeader event={event} winners={winners} />
      <NightRecapFilms event={event} winners={winners} />
      <NightRecapCta eventSlug={eventSlug} />
    </PageLayout>
  );
}

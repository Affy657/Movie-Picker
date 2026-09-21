import { Link } from 'react-router';
import { AlertCircle, Film, Link2Off } from 'lucide-react';
import EmptyState from '@/shared/components/EmptyState';
import PageLayout from '@/shared/components/PageLayout';
import Button, { buttonClass } from '@/shared/components/Button';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import styles from './NightRecap.module.css';

export function NightRecapSkeleton() {
  const { t } = useTranslation();
  return (
    <PageLayout>
      <SkeletonScreen label={t('events.detail.loading')}>
        <Skeleton variant="text" className={styles.skeletonTitle} />
        <Skeleton variant="text" className={styles.skeletonMeta} />
        <Skeleton className={styles.skeletonCard} />
      </SkeletonScreen>
    </PageLayout>
  );
}

export function NightRecapWaiting({
  slug,
  title,
  finished,
}: Readonly<{ slug: string; title: string; finished: boolean }>) {
  const { t } = useTranslation();
  return (
    <PageLayout>
      <EmptyState
        className={styles.state}
        icon={<Film size={ICON_SIZE['3xl']} aria-hidden />}
        titleTag="h1"
        title={t(finished ? 'events.recap.noMovieTitle' : 'events.recap.notChosenTitle')}
        message={t(finished ? 'events.recap.noMovieText' : 'events.recap.notChosenText', { title })}
        actions={
          <Link to={ROUTES.eventDetail(slug)} className={buttonClass()}>
            {t('events.recap.viewNight')}
          </Link>
        }
      />
    </PageLayout>
  );
}

export function NightRecapNotFound() {
  const { t } = useTranslation();
  return (
    <PageLayout className="page--centered page--errorState">
      <span className="errorStateIcon" aria-hidden>
        <Link2Off size={ICON_SIZE['4xl']} />
      </span>
      <h1 className="errorStateMessage">{t('events.recap.notFoundTitle')}</h1>
      <p role="alert">{t('events.recap.notFoundText')}</p>
      <Link to={ROUTES.home} className={buttonClass()}>
        {t('events.detail.backHome')}
      </Link>
    </PageLayout>
  );
}

export function NightRecapLoadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const { t } = useTranslation();
  return (
    <PageLayout className="page--centered page--errorState">
      <span className="errorStateIcon" aria-hidden>
        <AlertCircle size={ICON_SIZE['4xl']} />
      </span>
      <h1 className="errorStateMessage">{t('events.recap.errorTitle')}</h1>
      <p role="alert">{t('events.recap.errorText')}</p>
      <Button type="button" variant="primary" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    </PageLayout>
  );
}

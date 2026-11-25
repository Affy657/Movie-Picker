import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import Card from '@/shared/components/Card';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import styles from './NightRecap.module.css';
import { ENTRY_ORIGIN_QUERY_PARAM } from '@/shared/analytics/entryOrigin';

export default function NightRecapCta({ eventSlug }: Readonly<{ eventSlug: string | null }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const hostYourOwn = user
    ? ROUTES.createEvent
    : withReturnTo(ROUTES.register, `${ROUTES.createEvent}?${ENTRY_ORIGIN_QUERY_PARAM}=recap`);

  return (
    <Card as="section" padding="lg" className={styles.cta} aria-label={t('events.recap.ctaTitle')}>
      <h2 className={styles.ctaTitle}>{t('events.recap.ctaTitle')}</h2>
      <p className={styles.ctaText}>{t('events.recap.ctaText')}</p>
      <div className={styles.ctaActions}>
        <Link to={hostYourOwn} className={buttonClass({ variant: 'primary', size: 'lg' })}>
          {t('events.recap.ctaButton')}
        </Link>
        {eventSlug ? (
          <Link to={ROUTES.eventDetail(eventSlug)} className={buttonClass({ variant: 'ghost' })}>
            {t('events.recap.viewNight')}
            <ArrowRight size={ICON_SIZE.sm} aria-hidden />
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

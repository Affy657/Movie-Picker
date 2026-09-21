import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import Card from '@/shared/components/Card';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import styles from './NightRecap.module.css';

export default function NightRecapCta({ slug }: Readonly<{ slug: string }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const hostYourOwn = user ? ROUTES.createEvent : withReturnTo(ROUTES.register, ROUTES.createEvent);

  return (
    <Card as="section" padding="lg" className={styles.cta} aria-label={t('events.recap.ctaTitle')}>
      <h2 className={styles.ctaTitle}>{t('events.recap.ctaTitle')}</h2>
      <p className={styles.ctaText}>{t('events.recap.ctaText')}</p>
      <div className={styles.ctaActions}>
        <Link to={hostYourOwn} className={buttonClass({ variant: 'primary', size: 'lg' })}>
          {t('events.recap.ctaButton')}
        </Link>
        <Link to={ROUTES.eventDetail(slug)} className={buttonClass({ variant: 'ghost' })}>
          {t('events.recap.viewNight')}
          <ArrowRight size={ICON_SIZE.sm} aria-hidden />
        </Link>
      </div>
    </Card>
  );
}

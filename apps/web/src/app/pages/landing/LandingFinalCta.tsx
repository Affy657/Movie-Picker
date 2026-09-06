import clsx from 'clsx';
import { Link } from 'react-router';
import { buttonClass } from '@/shared/components/Button';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { LANDING_ANCHORS } from './anchors';
import shared from './landingShared.module.css';
import styles from './LandingFinalCta.module.css';

export default function LandingFinalCta() {
  const { t } = useTranslation();

  return (
    <section
      className={clsx('on-dark', shared.ink, styles.final)}
      id={LANDING_ANCHORS.final}
      aria-labelledby="landing-final"
    >
      <div className={clsx(shared.container, styles.inner)}>
        <p className={shared.eyebrow}>{t('landing.final.eyebrow')}</p>
        <h2 className={shared.h2} id="landing-final">
          {t('landing.final.title')}
        </h2>
        <p className={clsx(shared.lead, shared.center)}>{t('landing.final.lead')}</p>
        <div className={styles.ctas}>
          <Link to={ROUTES.register} className={buttonClass({ variant: 'primary', size: 'lg' })}>
            {t('home.ctaRegister')}
          </Link>
          <Link to={ROUTES.login} className={buttonClass({ size: 'lg' })}>
            {t('home.ctaLogin')}
          </Link>
        </div>
        <p className={styles.note}>{t('landing.final.note')}</p>
      </div>
    </section>
  );
}

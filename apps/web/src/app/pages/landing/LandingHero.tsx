import clsx from 'clsx';
import { Link } from 'react-router';
import Avatar from '@/shared/components/Avatar';
import { buttonClass } from '@/shared/components/Button';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import EventPreviewCard from './EventPreviewCard';
import { LANDING_ANCHORS } from './anchors';
import demo from './landingDemo.module.css';
import shared from './landingShared.module.css';
import styles from './LandingHero.module.css';

export default function LandingHero() {
  const { t } = useTranslation();

  return (
    <section className={clsx('on-dark', shared.ink, styles.hero)} aria-labelledby="landing-hero">
      <div className={clsx(shared.container, styles.grid)}>
        <div className={styles.copy}>
          <span className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            <span className={clsx(shared.eyebrow, styles.badgeText)}>
              {t('landing.hero.badge')}
            </span>
          </span>

          <h1 className={shared.display} id="landing-hero">
            {t('landing.hero.titleLead')}{' '}
            <span className={shared.accent}>{t('landing.hero.titleAccent')}</span>
          </h1>

          <p className={shared.lead}>{t('landing.hero.lead')}</p>

          <div className={styles.ctas}>
            <Link to={ROUTES.register} className={buttonClass({ variant: 'primary', size: 'lg' })}>
              {t('home.ctaRegister')}
            </Link>
            <a href={`#${LANDING_ANCHORS.steps}`} className={buttonClass({ size: 'lg' })}>
              {t('landing.hero.seeHow')}
            </a>
          </div>

          <p className={styles.note}>
            <span>{t('landing.hero.free')}</span>
            <span>
              {t('landing.hero.alreadyAccount')}{' '}
              <Link to={ROUTES.login} className={styles.quietLink}>
                {t('home.ctaLogin')}
              </Link>
            </span>
          </p>
        </div>

        <div className={styles.stage}>
          <EventPreviewCard />

          <p className={clsx(demo.floatNote, demo.floatNoteA)}>
            <Avatar avatarId={null} pseudo="Sam" size="xs" />
            {t('landing.demo.noteProposed')} <strong>Parasite</strong>
          </p>
          <p className={clsx(demo.floatNote, demo.floatNoteB)}>
            <Avatar avatarId={null} pseudo="Inès" size="xs" />
            {t('landing.demo.noteVoted')} <strong>Whiplash</strong>
          </p>
        </div>
      </div>
    </section>
  );
}

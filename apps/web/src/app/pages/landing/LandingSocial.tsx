import clsx from 'clsx';
import { Flame } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Card from '@/shared/components/Card';
import { useTranslation } from '@/shared/i18n';
import DemoPoster from './DemoPoster';
import { DEMO_LAST_SEEN, DEMO_PROFILE_STATS } from './demoContent';
import shared from './landingShared.module.css';
import styles from './LandingSocial.module.css';

export default function LandingSocial() {
  const { t } = useTranslation();

  const stats = [
    { value: DEMO_PROFILE_STATS.events, label: t('landing.social.statEvents') },
    { value: DEMO_PROFILE_STATS.movies, label: t('landing.social.statMovies') },
    { value: DEMO_PROFILE_STATS.winners, label: t('landing.social.statWinners') },
  ];

  return (
    <section
      className={clsx(shared.section, styles.section, shared.tint)}
      aria-labelledby="landing-social"
    >
      <div className={clsx(shared.container, styles.grid)}>
        <div className={clsx(shared.head, shared.headFlush, shared.reveal)}>
          <p className={shared.eyebrow}>{t('landing.social.eyebrow')}</p>
          <h2 className={shared.h2} id="landing-social">
            {t('landing.social.title')}
          </h2>
          <p className={shared.lead}>{t('landing.social.lead')}</p>
        </div>

        <Card
          as="article"
          padding="none"
          elevation="sm"
          className={clsx(styles.profile, shared.reveal)}
          aria-label={t('landing.social.profileLabel')}
        >
          <div className={styles.top}>
            <Avatar avatarId={null} pseudo="Léa" size="lg" />
            <span>
              <span className={styles.name}>Léa</span>
              <span className={styles.handle}>{t('landing.social.handle')}</span>
            </span>
            <span className={styles.flame}>
              <Flame size={15} aria-hidden="true" />
              <span>{t('landing.social.streak')}</span>
            </span>
          </div>

          <div className={styles.stats}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.stat}>
                <p className={styles.statValue}>{stat.value}</p>
                <p className={styles.statLabel}>{stat.label}</p>
              </div>
            ))}
          </div>

          <div className={styles.lastSeen}>
            <p className={styles.lastSeenLabel}>{t('landing.social.lastSeen')}</p>
            <div className={styles.lastSeenRow} aria-hidden="true">
              {DEMO_LAST_SEEN.map((movie) => (
                <DemoPoster key={movie.title} tone={movie.tone} label={movie.title} large />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

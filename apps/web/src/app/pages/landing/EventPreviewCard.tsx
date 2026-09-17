import clsx from 'clsx';
import { Disc3 } from 'lucide-react';
import AvatarStack from '@/shared/components/AvatarStack';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import { buttonClass } from '@/shared/components/Button';
import { useTranslation } from '@/shared/i18n';
import DemoPoster from './DemoPoster';
import { DEMO_EVENT_MOVIES, DEMO_PARTICIPANTS } from './demoContent';
import styles from './landingDemo.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

const DEMO_HIDDEN_PARTICIPANTS = 2;

export default function EventPreviewCard() {
  const { t } = useTranslation();

  return (
    <Card
      as="article"
      padding="none"
      className={clsx('on-dark', styles.app, styles.appDark, styles.eventCard)}
      aria-label={t('landing.demo.cardLabel')}
    >
      <div className={styles.appBar} aria-hidden="true">
        <span className={styles.appDot} />
        <span className={styles.appDot} />
        <span className={styles.appDot} />
        <span className={styles.appUrl}>{t('landing.demo.url')}</span>
      </div>

      <div className={styles.appBody}>
        <div>
          <p className={styles.eventTitle}>{t('landing.demo.eventTitle')}</p>
          <p className={styles.metaRow}>
            <span className={styles.mono}>{t('landing.demo.when')}</span>
            <Chip tone="success" size="sm">
              {t('landing.demo.votesOpen')}
            </Chip>
          </p>
        </div>

        <div className={styles.avatars}>
          <AvatarStack
            className={styles.avatarGroup}
            size="sm"
            max={DEMO_PARTICIPANTS.length}
            hidden={DEMO_HIDDEN_PARTICIPANTS}
            ariaLabel={t('landing.demo.participants')}
            people={DEMO_PARTICIPANTS.map((pseudo) => ({ key: pseudo, avatarId: null, pseudo }))}
          />
          <Chip tone="primary" size="sm">
            {t('landing.demo.host')}
          </Chip>
        </div>

        {DEMO_EVENT_MOVIES.map((movie) => (
          <div key={movie.title} className={styles.movieRow}>
            <DemoPoster tone={movie.tone} label={movie.title} />
            <span>
              <span className={styles.movieTitle}>{movie.title}</span>
              <span className={styles.movieMeta}>{movie.meta}</span>
            </span>
            <span className={styles.votes} aria-hidden="true">
              <span className={clsx(styles.vote, styles.voteUp)}>
                <span>{`▲ ${movie.up}`}</span>
              </span>
              <span className={styles.vote}>
                <span>{`▼ ${movie.down}`}</span>
              </span>
            </span>
          </div>
        ))}

        <span className={buttonClass({ variant: 'primary' })} aria-hidden="true">
          <Disc3 size={ICON_SIZE.lg} />
          {t('landing.demo.spin')}
        </span>
      </div>
    </Card>
  );
}

import clsx from 'clsx';
import { Check, MessageSquare } from 'lucide-react';
import Card from '@/shared/components/Card';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import DemoPoster from './DemoPoster';
import { DEMO_WINNER } from './demoContent';
import shared from './landingShared.module.css';
import styles from './LandingProblem.module.css';

const THREAD = [
  { who: 'Léa', key: 'm1', mine: false, fade: false },
  { who: 'Nico', key: 'm2', mine: false, fade: false },
  { who: 'Sam', key: 'm3', mine: true, fade: false },
  { who: 'Inès', key: 'm4', mine: false, fade: false },
  { who: 'Nico', key: 'm5', mine: false, fade: true },
] as const;

const TIMELINE = ['t1', 't2', 't3', 't4'] as const;

export default function LandingProblem() {
  const { t } = useTranslation();

  return (
    <section className={clsx(shared.section, styles.section)} aria-labelledby="landing-problem">
      <div className={shared.container}>
        <div className={clsx(shared.head, shared.reveal)}>
          <p className={shared.eyebrow}>{t('landing.problem.eyebrow')}</p>
          <h2 className={shared.h2} id="landing-problem">
            {t('landing.problem.title')}
          </h2>
          <p className={shared.lead}>{t('landing.problem.lead')}</p>
        </div>

        <div className={styles.grid}>
          <Card
            as="article"
            padding="none"
            className={clsx(styles.panel, styles.panelMuted, shared.reveal)}
          >
            <p className={styles.panelLabel}>
              <MessageSquare size={15} aria-hidden="true" />
              {t('landing.problem.threadLabel')}
            </p>
            <div className={styles.thread}>
              {THREAD.map((message, index) => (
                <p
                  key={`${message.who}-${index}`}
                  className={clsx(
                    styles.bubble,
                    message.mine && styles.bubbleMe,
                    message.fade && styles.bubbleFade
                  )}
                >
                  <span className={styles.bubbleWho}>{message.who}</span>
                  {t(`landing.problem.thread.${message.key}` as TranslationKey)}
                </p>
              ))}
            </div>
            <p className={styles.threadEnd}>{t('landing.problem.threadEnd')}</p>
          </Card>

          <Card as="article" padding="none" elevated className={clsx(styles.panel, shared.reveal)}>
            <p className={clsx(styles.panelLabel, styles.panelLabelGood)}>
              <Check size={15} aria-hidden="true" />
              {t('landing.problem.timelineLabel')}
            </p>
            <div className={styles.timeline}>
              {TIMELINE.map((step) => (
                <div key={step} className={styles.timelineItem}>
                  <span className={styles.timelineTime}>
                    {t(`landing.problem.timeline.${step}.time` as TranslationKey)}
                  </span>
                  <div className={styles.timelineBody}>
                    <p className={styles.timelineTitle}>
                      {t(`landing.problem.timeline.${step}.title` as TranslationKey)}
                    </p>
                    <p className={styles.timelineText}>
                      {t(`landing.problem.timeline.${step}.text` as TranslationKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className={styles.winner}>
              <DemoPoster tone={1} label={DEMO_WINNER} className={styles.winnerPoster} />
              <span>
                <span className={styles.winnerLabel}>{t('landing.problem.winnerLabel')}</span>
                <span className={styles.winnerTitle}>{DEMO_WINNER}</span>
              </span>
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

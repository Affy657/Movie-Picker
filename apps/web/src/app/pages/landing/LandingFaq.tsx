import clsx from 'clsx';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { LANDING_ANCHORS } from './anchors';
import shared from './landingShared.module.css';
import styles from './LandingFaq.module.css';

const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const;

export default function LandingFaq() {
  const { t } = useTranslation();

  return (
    <section
      className={clsx(shared.section, styles.section, shared.tint)}
      id={LANDING_ANCHORS.faq}
      aria-labelledby="landing-faq"
    >
      <div className={shared.container}>
        <div className={clsx(shared.head, shared.headCenter, shared.reveal)}>
          <p className={shared.eyebrow}>{t('landing.faq.eyebrow')}</p>
          <h2 className={shared.h2} id="landing-faq">
            {t('landing.faq.title')}
          </h2>
        </div>

        <div className={clsx(styles.faq, shared.reveal)}>
          {QUESTIONS.map((question, index) => (
            <details key={question} className={styles.entry} open={index === 0}>
              <summary className={styles.summary}>
                {t(`landing.faq.${question}.q` as TranslationKey)}
              </summary>
              <p className={styles.answer}>{t(`landing.faq.${question}.a` as TranslationKey)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

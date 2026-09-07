import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { TechHint } from './TechBlocks';
import styles from './techPage.module.css';

const TRAJECTORY_STEPS = ['mvp', 'migration', 'v1', 'v12', 'v14', 'v15'] as const;

export default function TechTimeline() {
  const { t } = useTranslation();

  return (
    <ol className={styles.timeline}>
      {TRAJECTORY_STEPS.map((step) => (
        <li className={styles.timelineItem} key={step}>
          <span className={styles.timelineMarker} aria-hidden="true" />
          <p className={styles.timelineWhen}>
            {t(`tech.trajectory.${step}When` as TranslationKey)}
          </p>
          <h3 className={styles.timelineWhat}>
            <TechHint label={t(`tech.trajectory.${step}Hint` as TranslationKey)}>
              {t(`tech.trajectory.${step}What` as TranslationKey)}
            </TechHint>
          </h3>
          <p className={styles.timelineDetail}>
            {t(`tech.trajectory.${step}Detail` as TranslationKey)}
          </p>
        </li>
      ))}
    </ol>
  );
}

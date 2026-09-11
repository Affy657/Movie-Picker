import clsx from 'clsx';
import { Fragment } from 'react';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { TechHint } from './TechBlocks';
import shared from './techShared.module.css';
import styles from './techPage.module.css';

type MilestoneState = 'shipped' | 'current' | 'planned';

const MILESTONES: readonly { key: string; items: number; state: MilestoneState }[] = [
  { key: 'mvp', items: 5, state: 'shipped' },
  { key: 'dotnet', items: 4, state: 'shipped' },
  { key: 'v1', items: 7, state: 'shipped' },
  { key: 'v11', items: 6, state: 'shipped' },
  { key: 'v12', items: 6, state: 'shipped' },
  { key: 'v13', items: 7, state: 'shipped' },
  { key: 'v14', items: 7, state: 'shipped' },
  { key: 'v15', items: 5, state: 'shipped' },
  { key: 'v16', items: 6, state: 'current' },
  { key: 'v17', items: 7, state: 'planned' },
  { key: 'v18', items: 6, state: 'planned' },
  { key: 'v2', items: 3, state: 'planned' },
];

const UNSCOPED_STRETCH_BEFORE = 'v2';

const countByState = (state: MilestoneState) =>
  MILESTONES.filter((milestone) => milestone.state === state).length;

export const SHIPPED_MILESTONES = countByState('shipped');

export const CURRENT_MILESTONES = countByState('current');

export const PLANNED_MILESTONES = countByState('planned');

export default function TechTimeline() {
  const { t } = useTranslation();

  return (
    <ol className={styles.timeline}>
      {MILESTONES.map(({ key, items, state }) => (
        <Fragment key={key}>
          {key === UNSCOPED_STRETCH_BEFORE ? (
            <li className={styles.timelineStretch} data-state="unplanned">
              <p className={styles.timelineStretchSpan}>{t('tech.trajectory.unplannedSpan')}</p>
              <p className={styles.timelineStretchDetail}>{t('tech.trajectory.unplannedDetail')}</p>
            </li>
          ) : null}
          <li className={styles.timelineItem} data-state={state}>
            <span className={styles.timelineMarker} aria-hidden="true" />
            <p className={styles.timelineWhen}>
              <span>{t(`tech.trajectory.${key}When` as TranslationKey)}</span>
              {state === 'planned' ? (
                <span className={styles.timelineBadge}>{t('tech.trajectory.plannedBadge')}</span>
              ) : null}
              {state === 'current' ? (
                <span className={styles.timelineBadge}>{t('tech.trajectory.currentBadge')}</span>
              ) : null}
            </p>
            <h3 className={styles.timelineWhat}>
              <TechHint label={t(`tech.trajectory.${key}Hint` as TranslationKey)}>
                {t(`tech.trajectory.${key}What` as TranslationKey)}
              </TechHint>
            </h3>
            <p className={styles.timelineDetail}>
              {t(`tech.trajectory.${key}Detail` as TranslationKey)}
            </p>
            <ul className={clsx(shared.tags, styles.timelineChips)}>
              {Array.from({ length: items }, (_, index) => (
                <li key={index}>
                  <span className={shared.tag}>
                    {t(`tech.trajectory.${key}Item${index + 1}` as TranslationKey)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

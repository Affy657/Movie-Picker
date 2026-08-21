import { Disc3, Lock, MousePointerClick } from 'lucide-react';
import clsx from 'clsx';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import { useTranslation } from '@/shared/i18n';
import styles from './EventWheelActions.module.css';

type EventWheelActionsProps = {
  wheel: EventWheelState;
  onRequestCloseWithoutMovie?: () => void;
};

export default function EventWheelActions({
  wheel,
  onRequestCloseWithoutMovie,
}: Readonly<EventWheelActionsProps>) {
  const { t } = useTranslation();
  if (!wheel.canSpin && !wheel.manualMode && !wheel.showClose) return null;

  const spinLabel = wheel.showRelaunch
    ? t('events.wheel.relaunchButton')
    : t('events.wheel.launchButton');
  const disabledHint = wheel.noEligibleMovie
    ? t('events.wheel.allExcludedHint')
    : wheel.spinDisabled
      ? t('events.wheel.emptyPlaceholder')
      : undefined;

  const closeLabel = wheel.closeWithoutMovie
    ? t('events.wheel.closeWithoutMovieButton')
    : t('events.wheel.closeButton');

  const handleCloseClick = () => {
    if (wheel.closeWithoutMovie && onRequestCloseWithoutMovie) {
      onRequestCloseWithoutMovie();
      return;
    }
    wheel.closeEvent();
  };

  return (
    <>
      {wheel.manualMode ? (
        <div className={styles.manualBar} role="status">
          <span className={styles.manualHint}>{t('events.wheel.manualPickHint')}</span>
          <button
            type="button"
            className={clsx('btn btn-sm', styles.manualCancel)}
            onClick={wheel.cancelManualMode}
          >
            {t('events.wheel.manualPickCancel')}
          </button>
        </div>
      ) : (
        wheel.canSpin && (
          <>
            <button
              type="button"
              className={clsx('btn btn-primary', styles.spin)}
              onClick={wheel.launch}
              disabled={wheel.loading || wheel.spinDisabled}
              title={disabledHint}
            >
              <Disc3 size={16} aria-hidden />
              <span className={styles.spinLabel}>
                {wheel.loading ? t('events.wheel.spinning') : spinLabel}
              </span>
            </button>
            <button
              type="button"
              className={clsx('btn', styles.manualPick)}
              onClick={wheel.enterManualMode}
              disabled={wheel.loading || wheel.spinDisabled}
              title={disabledHint}
            >
              <MousePointerClick size={15} aria-hidden />
              <span className={styles.manualPickLabel}>{t('events.wheel.manualPickButton')}</span>
            </button>
          </>
        )
      )}
      {wheel.showClose && (
        <button
          type="button"
          className={clsx('btn', styles.close)}
          onClick={handleCloseClick}
          disabled={wheel.loading}
        >
          <Lock size={15} aria-hidden />
          <span className={styles.closeLabel}>{closeLabel}</span>
        </button>
      )}
    </>
  );
}

import { Disc3, Lock, MousePointerClick, Undo2 } from 'lucide-react';
import clsx from 'clsx';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import { useTranslation } from '@/shared/i18n';
import styles from './EventWheelActions.module.css';

type EventWheelActionsProps = {
  wheel: EventWheelState;
  onRequestReset: () => void;
  onRequestCloseWithoutMovie?: () => void;
};

export default function EventWheelActions({
  wheel,
  onRequestCloseWithoutMovie,
  onRequestReset,
}: Readonly<EventWheelActionsProps>) {
  const { t } = useTranslation();
  if (!wheel.canSpin && !wheel.manualMode && !wheel.showClose) return null;

  const spinLabel = wheel.showRelaunch
    ? t('events.wheel.relaunchButton')
    : t('events.wheel.launchButton');
  let disabledHint: string | undefined;
  if (wheel.noEligibleMovie) disabledHint = t('events.wheel.allExcludedHint');
  else if (wheel.spinDisabled) disabledHint = t('events.wheel.emptyPlaceholder');

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
        <output className={styles.manualBar}>
          <span className={styles.manualHint}>{t('events.wheel.manualPickHint')}</span>
          <button
            type="button"
            className={clsx('btn btn-sm', styles.manualCancel)}
            onClick={wheel.cancelManualMode}
          >
            {t('events.wheel.manualPickCancel')}
          </button>
        </output>
      ) : (
        wheel.canSpin && (
          <>
            <button
              type="button"
              className={clsx(
                'btn',
                !wheel.showRelaunch && 'btn-primary',
                styles.spin,
                !wheel.showRelaunch && styles.spinGrow
              )}
              onClick={wheel.launch}
              disabled={wheel.loading || wheel.spinDisabled}
              title={disabledHint ?? (wheel.showRelaunch ? spinLabel : undefined)}
            >
              <Disc3 size={16} aria-hidden />
              <span className={clsx(styles.spinLabel, wheel.showRelaunch && styles.iconOnlyLabel)}>
                {wheel.loading ? t('events.wheel.spinning') : spinLabel}
              </span>
              {!wheel.showRelaunch && wheel.eligibleMovies.length > 0 ? (
                <span className={styles.spinCount}>{wheel.eligibleMovies.length}</span>
              ) : null}
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
      {wheel.showReset ? (
        <button
          type="button"
          className={clsx('btn', styles.reset)}
          onClick={onRequestReset}
          disabled={wheel.loading}
          title={t('events.wheel.resetButton')}
        >
          <Undo2 size={15} aria-hidden />
          <span className={styles.resetLabel}>{t('events.wheel.resetButton')}</span>
        </button>
      ) : null}
      {wheel.showClose && (
        <button
          type="button"
          className={clsx('btn', styles.close)}
          onClick={handleCloseClick}
          disabled={wheel.loading}
          title={closeLabel}
        >
          <Lock size={15} aria-hidden />
          <span className={styles.closeLabel}>{closeLabel}</span>
        </button>
      )}
    </>
  );
}

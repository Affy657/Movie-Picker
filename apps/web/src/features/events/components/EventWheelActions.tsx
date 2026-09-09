import { Disc3, Lock, MousePointerClick, Undo2 } from 'lucide-react';
import clsx from 'clsx';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import { useTranslation } from '@/shared/i18n';
import styles from './EventWheelActions.module.css';
import Button from '@/shared/components/Button';

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

  const spinIsPrimary = wheel.primaryAction === 'spin';
  const closeIsPrimary = wheel.primaryAction === 'close';

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

  const spinControls =
    !wheel.manualMode && wheel.canSpin ? (
      <>
        <Button
          type="button"
          variant={spinIsPrimary ? 'primary' : 'secondary'}
          className={clsx(styles.spin, spinIsPrimary && styles.primaryGrow)}
          onClick={wheel.launch}
          disabled={wheel.loading || wheel.spinDisabled}
          title={disabledHint}
        >
          <Disc3 size={16} aria-hidden />
          <span className={clsx(styles.spinLabel, !spinIsPrimary && styles.iconOnlyLabel)}>
            {wheel.loading ? t('events.wheel.spinning') : spinLabel}
          </span>
          {spinIsPrimary && wheel.eligibleMovies.length > 0 ? (
            <span className={styles.spinCount}>{wheel.eligibleMovies.length}</span>
          ) : null}
        </Button>
        <Button
          type="button"
          className={styles.manualPick}
          onClick={wheel.enterManualMode}
          disabled={wheel.loading || wheel.spinDisabled}
          title={disabledHint}
        >
          <MousePointerClick size={15} aria-hidden />
          <span className={styles.manualPickLabel}>{t('events.wheel.manualPickButton')}</span>
        </Button>
      </>
    ) : null;

  const resetControl = wheel.showReset ? (
    <Button
      type="button"
      className={styles.reset}
      onClick={onRequestReset}
      disabled={wheel.loading}
    >
      <Undo2 size={15} aria-hidden />
      <span className={styles.resetLabel}>{t('events.wheel.resetButton')}</span>
    </Button>
  ) : null;

  const closeControl = wheel.showClose ? (
    <Button
      type="button"
      variant={closeIsPrimary ? 'primary' : 'secondary'}
      className={clsx(styles.close, closeIsPrimary && styles.primaryGrow)}
      onClick={handleCloseClick}
      disabled={wheel.loading}
    >
      <Lock size={15} aria-hidden />
      <span className={clsx(styles.closeLabel, !closeIsPrimary && styles.iconOnlyLabel)}>
        {closeLabel}
      </span>
    </Button>
  ) : null;

  if (wheel.manualMode) {
    return (
      <>
        <output className={styles.manualBar}>
          <span className={styles.manualHint}>{t('events.wheel.manualPickHint')}</span>
          <Button
            type="button"
            size="sm"
            className={styles.manualCancel}
            onClick={wheel.cancelManualMode}
          >
            {t('events.wheel.manualPickCancel')}
          </Button>
        </output>
        {resetControl}
        {closeControl}
      </>
    );
  }

  return (
    <>
      {closeIsPrimary ? closeControl : null}
      {spinControls}
      {resetControl}
      {closeIsPrimary ? null : closeControl}
    </>
  );
}

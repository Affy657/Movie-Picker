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

type Wheel = EventWheelActionsProps['wheel'];
type Translate = ReturnType<typeof useTranslation>['t'];

function SpinControls({
  wheel,
  spinIsPrimary,
  spinLabel,
  disabledHint,
  t,
}: Readonly<{
  wheel: Wheel;
  spinIsPrimary: boolean;
  spinLabel: string;
  disabledHint: string | undefined;
  t: Translate;
}>) {
  return (
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
  );
}

function ResetControl({
  wheel,
  onRequestReset,
  t,
}: Readonly<{ wheel: Wheel; onRequestReset: () => void; t: Translate }>) {
  return (
    <Button
      type="button"
      className={styles.reset}
      onClick={onRequestReset}
      disabled={wheel.loading}
    >
      <Undo2 size={15} aria-hidden />
      <span className={styles.resetLabel}>{t('events.wheel.resetButton')}</span>
    </Button>
  );
}

function CloseControl({
  wheel,
  closeIsPrimary,
  closeLabel,
  onClick,
}: Readonly<{
  wheel: Wheel;
  closeIsPrimary: boolean;
  closeLabel: string;
  onClick: () => void;
  t: Translate;
}>) {
  return (
    <Button
      type="button"
      variant={closeIsPrimary ? 'primary' : 'secondary'}
      className={clsx(styles.close, closeIsPrimary && styles.primaryGrow)}
      onClick={onClick}
      disabled={wheel.loading}
    >
      <Lock size={15} aria-hidden />
      <span className={clsx(styles.closeLabel, !closeIsPrimary && styles.iconOnlyLabel)}>
        {closeLabel}
      </span>
    </Button>
  );
}

function spinDisabledHint(
  wheel: EventWheelActionsProps['wheel'],
  t: ReturnType<typeof useTranslation>['t']
): string | undefined {
  if (wheel.noEligibleMovie) return t('events.wheel.allExcludedHint');
  if (wheel.spinDisabled) return t('events.wheel.emptyPlaceholder');
  return undefined;
}

export default function EventWheelActions({
  wheel,
  onRequestCloseWithoutMovie,
  onRequestReset,
}: Readonly<EventWheelActionsProps>) {
  const { t } = useTranslation();
  if (!wheel.canSpin && !wheel.manualMode && !wheel.showClose) return null;

  const spinIsPrimary = wheel.primaryAction === 'spin';
  const closeIsPrimary = wheel.primaryAction === 'close';
  const spinLabel = t(
    wheel.showRelaunch ? 'events.wheel.relaunchButton' : 'events.wheel.launchButton'
  );
  const closeLabel = t(
    wheel.closeWithoutMovie ? 'events.wheel.closeWithoutMovieButton' : 'events.wheel.closeButton'
  );
  const disabledHint = spinDisabledHint(wheel, t);

  const handleCloseClick = () => {
    if (wheel.closeWithoutMovie && onRequestCloseWithoutMovie) {
      onRequestCloseWithoutMovie();
      return;
    }
    wheel.closeEvent();
  };

  const spinControls =
    !wheel.manualMode && wheel.canSpin ? (
      <SpinControls
        wheel={wheel}
        spinIsPrimary={spinIsPrimary}
        spinLabel={spinLabel}
        disabledHint={disabledHint}
        t={t}
      />
    ) : null;

  const resetControl = wheel.showReset ? (
    <ResetControl wheel={wheel} onRequestReset={onRequestReset} t={t} />
  ) : null;

  const closeControl = wheel.showClose ? (
    <CloseControl
      wheel={wheel}
      closeIsPrimary={closeIsPrimary}
      closeLabel={closeLabel}
      onClick={handleCloseClick}
      t={t}
    />
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

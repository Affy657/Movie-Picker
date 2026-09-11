import { Disc3, MousePointerClick, RotateCcw, Undo2 } from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import { useTranslation } from '@/shared/i18n';
import styles from './EventWheelActions.module.css';
import Button from '@/shared/components/Button';
import Tooltip from '@/shared/components/Tooltip';

type EventWheelActionsProps = {
  wheel: EventWheelState;
  onRequestReset: () => void;
};

function IconAction({
  label,
  hint,
  icon,
  onClick,
  disabled,
  danger,
}: Readonly<{
  label: string;
  hint?: string | null;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}>) {
  return (
    <Tooltip label={hint ?? label} placement="top">
      <Button
        type="button"
        className={clsx(styles.iconAction, danger && styles.iconActionDanger)}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}

export default function EventWheelActions({
  wheel,
  onRequestReset,
}: Readonly<EventWheelActionsProps>) {
  const { t } = useTranslation();
  if (!wheel.canSpin && !wheel.manualMode && !wheel.removalMode) return null;

  const spinIsPrimary = wheel.primaryAction === 'spin';
  const hasWinner = wheel.winnerIds.length > 0;

  const spinLabel = hasWinner
    ? t('events.wheel.drawOneMoreButton')
    : t('events.wheel.launchButton');

  if (wheel.manualMode || wheel.removalMode) {
    const removing = wheel.removalMode;
    return (
      <output className={clsx(styles.selectionBar, removing && styles.selectionBarRemoving)}>
        <span className={styles.manualHint}>
          {removing ? t('events.wheel.removeWinnerHint') : t('events.wheel.manualPickHint')}
        </span>
        <Button
          type="button"
          size="sm"
          className={styles.manualCancel}
          onClick={removing ? wheel.cancelRemovalMode : wheel.cancelManualMode}
        >
          {t('events.wheel.manualPickCancel')}
        </Button>
      </output>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={spinIsPrimary ? 'primary' : 'secondary'}
        className={clsx(styles.spin, spinIsPrimary && styles.primaryGrow)}
        onClick={wheel.launch}
        disabled={wheel.loading || wheel.spinDisabled}
        title={wheel.spinDisabledHint ?? undefined}
      >
        <Disc3 size={16} aria-hidden />
        <span className={clsx(styles.spinLabel, !spinIsPrimary && styles.iconOnlyLabel)}>
          {wheel.loading ? t('events.wheel.spinning') : spinLabel}
        </span>
        {spinIsPrimary && wheel.remainingDraws > 0 ? (
          <span className={styles.spinCount}>{wheel.remainingDraws}</span>
        ) : null}
      </Button>
      <IconAction
        label={t('events.wheel.manualPickButton')}
        hint={wheel.spinDisabledHint}
        icon={<MousePointerClick size={16} aria-hidden />}
        onClick={wheel.enterManualMode}
        disabled={wheel.loading || wheel.spinDisabled}
      />
      {wheel.showRemoveWinner ? (
        <IconAction
          label={t('events.wheel.removeWinnerButton')}
          icon={<Undo2 size={16} aria-hidden />}
          onClick={wheel.enterRemovalMode}
          disabled={wheel.loading}
          danger
        />
      ) : null}
      {wheel.showReset ? (
        <IconAction
          label={t('events.wheel.resetButton')}
          icon={<RotateCcw size={16} aria-hidden />}
          onClick={onRequestReset}
          disabled={wheel.loading}
        />
      ) : null}
    </>
  );
}

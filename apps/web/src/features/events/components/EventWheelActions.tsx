import { useCallback, useId, useRef, useState } from 'react';
import {
  CircleMinus,
  Disc3,
  MoreHorizontal,
  MousePointerClick,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import { useTranslation } from '@/shared/i18n';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';
import { MenuItem, MenuPanel } from '@/shared/components/Menu';
import styles from './EventWheelActions.module.css';
import Button from '@/shared/components/Button';
import Tooltip from '@/shared/components/Tooltip';

type EventWheelActionsProps = {
  wheel: EventWheelState;
  onRequestReset: () => void;
};

type Translate = ReturnType<typeof useTranslation>['t'];

function IconAction({
  label,
  hint,
  icon,
  onClick,
  disabled,
}: Readonly<{
  label: string;
  hint?: string | null;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}>) {
  return (
    <Tooltip label={hint ?? label} placement="top">
      <Button
        type="button"
        className={styles.iconAction}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}

function SelectionBar({ wheel, t }: Readonly<{ wheel: EventWheelState; t: Translate }>) {
  const removing = wheel.removalMode;
  return (
    <output className={clsx(styles.selectionBar, removing && styles.selectionBarRemoving)}>
      {removing ? (
        <CircleMinus size={16} aria-hidden className={styles.selectionIcon} />
      ) : (
        <MousePointerClick size={16} aria-hidden className={styles.selectionIcon} />
      )}
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

function MoreActionsMenu({
  wheel,
  onRequestReset,
  t,
}: Readonly<{ wheel: EventWheelState; onRequestReset: () => void; t: Translate }>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);
  useMenuFocus(open, panelRef, triggerRef);
  const fitLeft = useMenuHorizontalFit(open, containerRef, panelRef);

  const label = t('events.wheel.moreActionsLabel');

  return (
    <div ref={containerRef} className={styles.menuContainer}>
      <Button
        ref={triggerRef}
        type="button"
        className={styles.iconAction}
        onClick={() => setOpen((value) => !value)}
        disabled={wheel.loading}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
      >
        <MoreHorizontal size={16} aria-hidden />
      </Button>
      {open ? (
        <MenuPanel
          ref={panelRef}
          id={menuId}
          label={label}
          style={fitLeft !== null ? { left: fitLeft, right: 'auto' } : undefined}
        >
          {wheel.showRemoveWinner ? (
            <MenuItem
              icon={<CircleMinus size={14} aria-hidden />}
              onClick={() => {
                close();
                wheel.enterRemovalMode();
              }}
            >
              {t('events.wheel.removeWinnerButton')}
            </MenuItem>
          ) : null}
          {wheel.showReset ? (
            <MenuItem
              danger
              icon={<RotateCcw size={14} aria-hidden />}
              onClick={() => {
                close();
                onRequestReset();
              }}
            >
              {t('events.wheel.resetButton')}
            </MenuItem>
          ) : null}
        </MenuPanel>
      ) : null}
    </div>
  );
}

function remainingDrawsLabel(count: number, t: Translate): string {
  return count === 1
    ? t('events.wheel.remainingDrawsOne')
    : t('events.wheel.remainingDrawsMany', { count });
}

function SpinButton({ wheel, t }: Readonly<{ wheel: EventWheelState; t: Translate }>) {
  const spinIsPrimary = wheel.primaryAction === 'spin';
  const hasWinner = wheel.winnerIds.length > 0;
  const spinLabel = hasWinner
    ? t('events.wheel.drawOneMoreButton')
    : t('events.wheel.launchButton');
  const showCount = spinIsPrimary && wheel.winnerCount > 1 && wheel.remainingDraws > 0;
  const remaining = remainingDrawsLabel(wheel.remainingDraws, t);

  return (
    <Button
      type="button"
      variant={spinIsPrimary ? 'primary' : 'secondary'}
      className={clsx(styles.spin, spinIsPrimary && styles.primaryGrow)}
      onClick={wheel.launch}
      disabled={wheel.loading || wheel.spinDisabled}
      title={wheel.spinDisabledHint ?? (showCount ? remaining : undefined)}
      aria-label={showCount ? `${spinLabel}, ${remaining}` : undefined}
    >
      <Disc3 size={16} aria-hidden />
      <span className={clsx(styles.spinLabel, !spinIsPrimary && styles.iconOnlyLabel)}>
        {wheel.loading ? t('events.wheel.spinning') : spinLabel}
      </span>
      {showCount ? (
        <span className={styles.spinCount} aria-hidden>
          <span>{wheel.remainingDraws}</span>
          <span className={styles.spinCountWord}>
            {wheel.remainingDraws === 1
              ? t('events.wheel.remainingWordOne')
              : t('events.wheel.remainingWordMany')}
          </span>
        </span>
      ) : null}
    </Button>
  );
}

function AllDrawnStatus({ wheel, t }: Readonly<{ wheel: EventWheelState; t: Translate }>) {
  return (
    <output className={styles.doneStatus} title={wheel.spinDisabledHint ?? undefined}>
      <Trophy size={16} aria-hidden className={styles.doneIcon} />
      <span className={styles.doneLabel}>
        {wheel.winnerCount === 1
          ? t('events.wheel.allDrawnStatusOne')
          : t('events.wheel.allDrawnStatusMany', { count: wheel.winnerCount })}
      </span>
    </output>
  );
}

export default function EventWheelActions({
  wheel,
  onRequestReset,
}: Readonly<EventWheelActionsProps>) {
  const { t } = useTranslation();
  if (!wheel.canSpin && !wheel.manualMode && !wheel.removalMode) return null;

  if (wheel.manualMode || wheel.removalMode) return <SelectionBar wheel={wheel} t={t} />;

  const allDrawn = wheel.remainingDraws === 0;
  const showMenu = wheel.showRemoveWinner || wheel.showReset;

  return (
    <>
      {allDrawn ? <AllDrawnStatus wheel={wheel} t={t} /> : <SpinButton wheel={wheel} t={t} />}
      {allDrawn ? null : (
        <IconAction
          label={t('events.wheel.manualPickButton')}
          hint={wheel.spinDisabledHint}
          icon={<MousePointerClick size={16} aria-hidden />}
          onClick={wheel.enterManualMode}
          disabled={wheel.loading || wheel.spinDisabled}
        />
      )}
      {showMenu ? <MoreActionsMenu wheel={wheel} onRequestReset={onRequestReset} t={t} /> : null}
    </>
  );
}

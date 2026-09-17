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
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { MenuItem, MenuPanel } from '@/shared/components/Menu';
import styles from './EventWheelActions.module.css';
import Button from '@/shared/components/Button';
import Tooltip from '@/shared/components/Tooltip';
import Chip from '@/shared/components/Chip';
import { ICON_SIZE } from '@/shared/components/iconSize';

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
        <CircleMinus size={ICON_SIZE.md} aria-hidden className={styles.selectionIcon} />
      ) : (
        <MousePointerClick size={ICON_SIZE.md} aria-hidden className={styles.selectionIcon} />
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
  const menu = useMenuState();
  const label = t('events.wheel.moreActionsLabel');

  return (
    <div ref={menu.containerRef} className={styles.menuContainer}>
      <Button
        {...menu.triggerProps}
        type="button"
        className={styles.iconAction}
        disabled={wheel.loading}
        aria-label={label}
      >
        <MoreHorizontal size={ICON_SIZE.md} aria-hidden />
      </Button>
      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={label} className={styles.menuPanel}>
          {wheel.showRemoveWinner ? (
            <MenuItem
              icon={<CircleMinus size={ICON_SIZE.sm} aria-hidden />}
              onClick={() => {
                menu.close();
                wheel.enterRemovalMode();
              }}
            >
              {t('events.wheel.removeWinnerButton')}
            </MenuItem>
          ) : null}
          {wheel.showReset ? (
            <MenuItem
              tone="danger"
              icon={<RotateCcw size={ICON_SIZE.sm} aria-hidden />}
              onClick={() => {
                menu.close();
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

function SpinButton({ wheel, t }: Readonly<{ wheel: EventWheelState; t: Translate }>) {
  const spinIsPrimary = wheel.primaryAction === 'spin';
  const hasWinner = wheel.winnerIds.length > 0;
  const spinLabel = hasWinner
    ? t('events.wheel.drawOneMoreButton')
    : t('events.wheel.launchButton');
  const showCount = spinIsPrimary && wheel.winnerCount > 1 && wheel.remainingDraws > 0;
  const remaining = pluralizeCount(
    wheel.remainingDraws,
    'events.wheel.remainingDrawsOne',
    'events.wheel.remainingDrawsMany',
    t
  );

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
      <Disc3 size={ICON_SIZE.md} aria-hidden />
      <span className={clsx(styles.spinLabel, !spinIsPrimary && styles.iconOnlyLabel)}>
        {wheel.loading ? t('events.wheel.spinning') : spinLabel}
      </span>
      {showCount ? (
        <span className={styles.spinCount} aria-hidden>
          <span>{wheel.remainingDraws}</span>
          <span className={styles.spinCountWord}>
            {pluralizeCount(
              wheel.remainingDraws,
              'events.wheel.remainingWordOne',
              'events.wheel.remainingWordMany',
              t
            )}
          </span>
        </span>
      ) : null}
    </Button>
  );
}

function AllDrawnStatus({ wheel, t }: Readonly<{ wheel: EventWheelState; t: Translate }>) {
  return (
    <output className={styles.doneStatus} title={wheel.spinDisabledHint ?? undefined}>
      <Chip tone="success" icon={Trophy}>
        {pluralizeCount(
          wheel.winnerCount,
          'events.wheel.allDrawnStatusOne',
          'events.wheel.allDrawnStatusMany',
          t
        )}
      </Chip>
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
  if (wheel.noMovie && !showMenu) return null;

  return (
    <>
      {allDrawn ? <AllDrawnStatus wheel={wheel} t={t} /> : <SpinButton wheel={wheel} t={t} />}
      {allDrawn ? null : (
        <IconAction
          label={t('events.wheel.manualPickButton')}
          hint={wheel.spinDisabledHint}
          icon={<MousePointerClick size={ICON_SIZE.md} aria-hidden />}
          onClick={wheel.enterManualMode}
          disabled={wheel.loading || wheel.spinDisabled}
        />
      )}
      {showMenu ? <MoreActionsMenu wheel={wheel} onRequestReset={onRequestReset} t={t} /> : null}
    </>
  );
}

import { Fragment, type ReactNode, type RefObject } from 'react';
import {
  Check,
  ChevronDown,
  CircleMinus,
  CircleX,
  Disc3,
  MousePointerClick,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import clsx from 'clsx';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import type {
  DrawManagement,
  EventHeaderActionsPlan,
  HeaderActionWeight,
} from '@/features/events/lib/eventHeaderActions';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { MenuItem, MenuPanel } from '@/shared/components/Menu';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import styles from './EventWheelActions.module.css';

type EventWheelActionsProps = {
  wheel: EventWheelState;
  plan: EventHeaderActionsPlan;
  onAddMovie?: () => void;
  addMovieTriggerRef?: RefObject<HTMLButtonElement | null>;
  onRequestReset: () => void;
  onRequestCloseWithoutMovie: () => void;
  onRate?: () => void;
};

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

function ActionLabel({ children, dense }: Readonly<{ children: ReactNode; dense: boolean }>) {
  return <span className={clsx(styles.label, dense && styles.denseLabel)}>{children}</span>;
}

function ManageMenu({
  wheel,
  manage,
  dense,
  onRequestReset,
  onRequestCloseWithoutMovie,
  t,
}: Readonly<{
  wheel: EventWheelState;
  manage: DrawManagement;
  dense: boolean;
  onRequestReset: () => void;
  onRequestCloseWithoutMovie: () => void;
  t: Translate;
}>) {
  const menu = useMenuState();
  const label = t('events.wheel.manageLabel');
  return (
    <div ref={menu.containerRef} className={styles.menuContainer}>
      <Button
        {...menu.triggerProps}
        type="button"
        variant={menu.open ? 'soft' : 'secondary'}
        className={styles.action}
        disabled={wheel.loading}
        title={dense ? label : undefined}
      >
        <SlidersHorizontal size={ICON_SIZE.md} aria-hidden />
        <ActionLabel dense={dense}>{label}</ActionLabel>
        <ChevronDown size={ICON_SIZE.sm} aria-hidden className={styles.menuChevron} />
      </Button>
      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={label} className={styles.menuPanel}>
          {manage.removeWinner ? (
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
          {manage.reset ? (
            <MenuItem
              tone="danger"
              icon={<RotateCcw size={ICON_SIZE.sm} aria-hidden />}
              aria-haspopup="dialog"
              onClick={() => {
                menu.close();
                onRequestReset();
              }}
            >
              {t('events.wheel.resetButton')}
            </MenuItem>
          ) : null}
          {manage.closeWithoutMovie ? (
            <MenuItem
              tone="danger"
              icon={<CircleX size={ICON_SIZE.sm} aria-hidden />}
              aria-haspopup="dialog"
              onClick={() => {
                menu.close();
                onRequestCloseWithoutMovie();
              }}
            >
              {t('events.wheel.closeWithoutMovieButton')}
            </MenuItem>
          ) : null}
        </MenuPanel>
      ) : null}
    </div>
  );
}

function DrawSplitButton({
  wheel,
  weight,
  t,
}: Readonly<{ wheel: EventWheelState; weight: HeaderActionWeight; t: Translate }>) {
  const menu = useMenuState();
  const primary = weight === 'primary';
  const hasWinner = wheel.winnerIds.length > 0;
  const drawLabel = hasWinner
    ? t('events.wheel.drawOneMoreButton')
    : t('events.wheel.launchButton');
  const showCount = primary && wheel.winnerCount > 1 && wheel.remainingDraws > 0;
  const remaining = pluralizeCount(
    wheel.remainingDraws,
    'events.wheel.remainingDrawsOne',
    'events.wheel.remainingDrawsMany',
    t
  );
  const disabled = wheel.loading || wheel.spinDisabled;
  const otherWays = t('events.wheel.otherWaysLabel');

  return (
    <div
      ref={menu.containerRef}
      className={clsx(styles.menuContainer, styles.split, primary && styles.grow)}
    >
      <Button
        type="button"
        variant={primary ? 'primary' : 'secondary'}
        className={clsx(styles.action, styles.splitMain)}
        onClick={wheel.launch}
        disabled={disabled}
        title={wheel.spinDisabledHint ?? (showCount ? remaining : undefined)}
        aria-label={showCount ? `${drawLabel}, ${remaining}` : undefined}
      >
        <Disc3 size={ICON_SIZE.md} aria-hidden />
        <span className={styles.label}>
          {wheel.loading ? t('events.wheel.spinning') : drawLabel}
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
      <Button
        {...menu.triggerProps}
        type="button"
        variant={primary ? 'primary' : 'secondary'}
        className={clsx(styles.action, styles.splitChevron)}
        disabled={disabled}
        aria-label={otherWays}
        title={otherWays}
      >
        <ChevronDown size={ICON_SIZE.sm} aria-hidden />
      </Button>
      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={otherWays} className={styles.menuPanel}>
          <MenuItem
            icon={<Disc3 size={ICON_SIZE.sm} aria-hidden />}
            onClick={() => {
              menu.close();
              wheel.launch();
            }}
          >
            {drawLabel}
          </MenuItem>
          <MenuItem
            icon={<MousePointerClick size={ICON_SIZE.sm} aria-hidden />}
            onClick={() => {
              menu.close();
              wheel.enterManualMode();
            }}
          >
            {t('events.wheel.manualPickButton')}
          </MenuItem>
        </MenuPanel>
      ) : null}
    </div>
  );
}

function ChosenStatus({ wheel, t }: Readonly<{ wheel: EventWheelState; t: Translate }>) {
  return (
    <output className={styles.chosen} title={wheel.spinDisabledHint ?? undefined}>
      <Check size={ICON_SIZE.md} aria-hidden />
      <span className={styles.chosenLabel}>
        {pluralizeCount(
          wheel.winnerCount,
          'events.wheel.allDrawnStatusOne',
          'events.wheel.allDrawnStatusMany',
          t
        )}
      </span>
    </output>
  );
}

function countButtons(plan: EventHeaderActionsPlan): number {
  return [plan.addMovie, plan.draw, plan.manage, plan.rate || null].filter(Boolean).length;
}

function AddMovieButton({
  weight,
  dense,
  onAddMovie,
  triggerRef,
  t,
}: Readonly<{
  weight: HeaderActionWeight;
  dense: boolean;
  onAddMovie: () => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  t: Translate;
}>) {
  const primary = weight === 'primary';
  const iconOnly = dense && !primary;
  const label = t('movies.search.label');
  return (
    <Button
      ref={triggerRef}
      type="button"
      variant={primary ? 'primary' : 'secondary'}
      className={clsx(styles.action, primary && styles.grow)}
      onClick={onAddMovie}
      title={iconOnly ? label : undefined}
    >
      <Plus size={ICON_SIZE.md} aria-hidden />
      <ActionLabel dense={iconOnly}>{label}</ActionLabel>
    </Button>
  );
}

function RateButton({ onRate, t }: Readonly<{ onRate: () => void; t: Translate }>) {
  return (
    <Button
      type="button"
      variant="primary"
      className={clsx(styles.action, styles.grow)}
      onClick={onRate}
    >
      <Star size={ICON_SIZE.md} aria-hidden />
      <span className={styles.label}>{t('events.ratings.rateAction')}</span>
    </Button>
  );
}

type WeightedAction = { key: string; node: ReactNode; weight: HeaderActionWeight };

function weightedActions(
  props: Readonly<EventWheelActionsProps>,
  dense: boolean,
  t: Translate
): ReactNode[] {
  const { wheel, plan, onAddMovie, addMovieTriggerRef, onRate } = props;
  const actions: WeightedAction[] = [];
  if (plan.draw) {
    actions.push({
      key: 'draw',
      weight: plan.draw,
      node: <DrawSplitButton wheel={wheel} weight={plan.draw} t={t} />,
    });
  }
  if (plan.addMovie && onAddMovie) {
    actions.push({
      key: 'add',
      weight: plan.addMovie,
      node: (
        <AddMovieButton
          weight={plan.addMovie}
          dense={dense}
          onAddMovie={onAddMovie}
          triggerRef={addMovieTriggerRef}
          t={t}
        />
      ),
    });
  }
  if (plan.rate && onRate) {
    actions.push({ key: 'rate', weight: 'primary', node: <RateButton onRate={onRate} t={t} /> });
  }
  return [
    ...actions.filter((entry) => entry.weight === 'secondary'),
    ...actions.filter((entry) => entry.weight === 'primary'),
  ].map((entry) => <Fragment key={entry.key}>{entry.node}</Fragment>);
}

export default function EventWheelActions(props: Readonly<EventWheelActionsProps>) {
  const { wheel, plan, onRequestReset, onRequestCloseWithoutMovie } = props;
  const { t } = useTranslation();
  if (wheel.manualMode || wheel.removalMode) return <SelectionBar wheel={wheel} t={t} />;

  const dense = countButtons(plan) + (plan.chosen ? 1 : 0) >= 3;
  const ordered = weightedActions(props, dense, t);

  if (!plan.chosen && !plan.manage && ordered.length === 0) return null;

  return (
    <>
      {plan.chosen ? <ChosenStatus wheel={wheel} t={t} /> : null}
      {plan.manage ? (
        <ManageMenu
          wheel={wheel}
          manage={plan.manage}
          dense={dense}
          onRequestReset={onRequestReset}
          onRequestCloseWithoutMovie={onRequestCloseWithoutMovie}
          t={t}
        />
      ) : null}
      {ordered}
    </>
  );
}

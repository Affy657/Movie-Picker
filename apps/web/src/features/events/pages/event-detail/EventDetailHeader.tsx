import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ChevronDown, Plus, Settings } from 'lucide-react';
import clsx from 'clsx';
import EventShareButton from '@/features/events/components/EventShareButton';
import EventCalendarMenu from '@/features/events/components/EventCalendarMenu';
import EventThemeBanner from '@/features/events/components/EventThemeBanner';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import ViewModeToggle from '@/shared/components/ViewModeToggle';
import AvatarStack from '@/shared/components/AvatarStack';
import type { EventParticipantSummary, MyEventLifecycle } from '@/shared/types/event';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { participantsCountLabel } from '@/features/events/utils/eventLabels';
import { ROUTES } from '@/app/routes';
import styles from './EventDetailHeader.module.css';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import Tooltip from '@/shared/components/Tooltip';
import { ICON_SIZE } from '@/shared/components/iconSize';

const MAX_STACKED_AVATARS = 4;
const STICKY_BAR_MEDIA = '(min-width: 48rem)';

function useWheelActionsHeight(
  wheelActionsRef: RefObject<HTMLDivElement | null>,
  wheelActions: ReactNode
) {
  useEffect(() => {
    const el = wheelActionsRef.current;
    const root = document.documentElement;
    if (!el || typeof ResizeObserver !== 'function') return;
    const sync = () => {
      const height = el.offsetHeight;
      if (height > 0) {
        root.style.setProperty('--event-wheel-bar-height', `${height}px`);
      } else {
        root.style.removeProperty('--event-wheel-bar-height');
      }
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--event-wheel-bar-height');
    };
  }, [wheelActions, wheelActionsRef]);
}

function useStickyBarHeight(stickyBar: boolean, barRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = barRef.current;
    const root = document.documentElement;
    if (!stickyBar || !el || typeof ResizeObserver !== 'function') return;
    const sync = () => {
      const height = el.offsetHeight;
      if (height > 0) {
        root.style.setProperty('--event-sticky-bar-height', `${height}px`);
      } else {
        root.style.removeProperty('--event-sticky-bar-height');
      }
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--event-sticky-bar-height');
    };
  }, [stickyBar, barRef]);
}

function useCondensedStickyBar(
  stickyBar: boolean,
  sentinelRef: RefObject<HTMLDivElement | null>,
  barRef: RefObject<HTMLElement | null>
) {
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    if (!stickyBar) {
      setCondensed(false);
      return;
    }
    const sentinel = sentinelRef.current;
    const bar = barRef.current;
    if (!sentinel || !bar || typeof IntersectionObserver !== 'function') return;
    const stickyOffsetPx = Number.parseFloat(getComputedStyle(bar).top) || 0;
    const observer = new IntersectionObserver(([entry]) => setCondensed(!entry?.isIntersecting), {
      rootMargin: `-${stickyOffsetPx}px 0px 0px 0px`,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [stickyBar, sentinelRef, barRef]);
  return condensed;
}

function useStickyBarMedia(): boolean {
  const [stickyBar, setStickyBar] = useState(
    () => globalThis.matchMedia?.(STICKY_BAR_MEDIA).matches ?? false
  );
  useEffect(() => {
    const query = globalThis.matchMedia?.(STICKY_BAR_MEDIA);
    if (!query) return;
    const sync = () => setStickyBar(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return stickyBar;
}

type ParticipantsStackProps = {
  participants: EventParticipantSummary[];
  hiddenCount: number;
  label?: string;
  ariaLabel?: string;
  open: boolean;
  onToggle: () => void;
  testId: string;
  bare?: boolean;
  className?: string;
};

function ParticipantsStack({
  participants,
  hiddenCount,
  label,
  ariaLabel,
  open,
  onToggle,
  testId,
  bare,
  className,
}: Readonly<ParticipantsStackProps>) {
  return (
    <button
      type="button"
      className={clsx(styles.stack, bare && styles.stackBare, className)}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={open ? 'event-participants-panel' : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
      data-participants-toggle
    >
      <AvatarStack
        people={participants.map((p) => ({ key: p.id, avatarId: p.avatarId, pseudo: p.pseudo }))}
        max={MAX_STACKED_AVATARS}
        hidden={hiddenCount}
      />
      {label ? <span className={styles.stackLabel}>{label}</span> : null}
      {bare ? null : (
        <ChevronDown
          className={styles.chevron}
          data-open={open || undefined}
          size={ICON_SIZE.sm}
          aria-hidden
        />
      )}
    </button>
  );
}

export type EventDetailHeaderProps = {
  title: string;
  dateFormatted: string;
  rawDate: string;
  rawTime: string;
  isFinished: boolean;
  eventTheme: string | null | undefined;
  shareUrl: string;

  lifecycle: MyEventLifecycle;

  countdownLabel?: string | null;

  participants?: EventParticipantSummary[];

  participantCount: number;

  moviesCount: number;

  votersCount: number;

  participantsOpen: boolean;

  onToggleParticipants: () => void;

  onOpenShare?: () => void;

  onOpenSettings?: () => void;

  wheelActions?: ReactNode;

  onAddMovie?: () => void;
  addMoviePrimary?: boolean;
  addMovieTriggerRef?: RefObject<HTMLButtonElement | null>;

  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
};

type UtilityActionsProps = {
  condensed: boolean;
  isFinished: boolean;
  shareUrl: string | undefined;
  title: string;
  rawDate: string;
  rawTime: string;
  onOpenShare: (() => void) | undefined;
  onOpenSettings: (() => void) | undefined;
  t: Translate;
};

function UtilityActions({
  condensed,
  isFinished,
  shareUrl,
  title,
  rawDate,
  rawTime,
  onOpenShare,
  onOpenSettings,
  t,
}: Readonly<UtilityActionsProps>) {
  return (
    <div className={styles.utilityActions}>
      {shareUrl && onOpenShare ? <EventShareButton onClick={onOpenShare} /> : null}
      {!condensed && !isFinished && shareUrl ? (
        <EventCalendarMenu title={title} date={rawDate} time={rawTime} url={shareUrl} />
      ) : null}
      {onOpenSettings ? (
        <IconButton
          size="lg"
          ariaLabel={t('events.settings.title')}
          onClick={onOpenSettings}
          aria-haspopup="dialog"
        >
          <Settings size={ICON_SIZE.md} aria-hidden />
        </IconButton>
      ) : null}
    </div>
  );
}

function HeaderActions({
  wheelActionsRef,
  addMoviePrimary,
  addMovieButton,
  wheelActions,
  utilityActions,
}: Readonly<{
  wheelActionsRef: RefObject<HTMLDivElement | null>;
  addMoviePrimary: boolean;
  addMovieButton: ReactNode;
  wheelActions: ReactNode;
  utilityActions: ReactNode;
}>) {
  return (
    <div className={styles.actions}>
      <div ref={wheelActionsRef} className={styles.wheelActions}>
        {addMoviePrimary ? addMovieButton : null}
        {wheelActions}
        {addMoviePrimary ? null : addMovieButton}
      </div>
      {utilityActions}
    </div>
  );
}

function HeaderRecap({
  dateFormatted,
  condensed,
  stacked,
  hiddenCount,
  participantsLabel,
  participantsOpen,
  onToggleParticipants,
  moviesLabel,
  moviesCount,
  votersLabel,
  viewMode,
  onViewModeChange,
}: Readonly<{
  dateFormatted: string;
  condensed: boolean;
  stacked: NonNullable<EventDetailHeaderProps['participants']>;
  hiddenCount: number;
  participantsLabel: string;
  participantsOpen: boolean;
  onToggleParticipants: () => void;
  moviesLabel: string;
  moviesCount: number;
  votersLabel: string;
  viewMode: EventDetailHeaderProps['viewMode'];
  onViewModeChange: EventDetailHeaderProps['onViewModeChange'];
}>) {
  return (
    <div className={styles.recap}>
      <span className={styles.date}>{dateFormatted}</span>
      {condensed ? null : (
        <>
          <span className={styles.sep} aria-hidden />
          <ParticipantsStack
            participants={stacked}
            hiddenCount={hiddenCount}
            label={participantsLabel}
            open={participantsOpen}
            onToggle={onToggleParticipants}
            testId="participants-toggle"
          />
        </>
      )}
      <span className={styles.stats}>
        <span className={styles.sep} aria-hidden />
        <span>{moviesLabel}</span>
        {moviesCount > 0 ? (
          <>
            <span className={styles.sep} aria-hidden />
            <span>{votersLabel}</span>
          </>
        ) : null}
      </span>
      {onViewModeChange && viewMode ? (
        <ViewModeToggle
          value={viewMode}
          onChange={onViewModeChange}
          className={styles.viewToggle}
        />
      ) : null}
    </div>
  );
}

type AddMovieButtonProps = {
  onAddMovie: () => void;
  primary: boolean;
  label: string;
  triggerRef?: RefObject<HTMLButtonElement | null>;
};

function AddMovieButton({ onAddMovie, primary, label, triggerRef }: Readonly<AddMovieButtonProps>) {
  const button = (
    <Button
      ref={triggerRef}
      type="button"
      variant={primary ? 'primary' : 'secondary'}
      className={clsx(styles.addMovieBtn, primary && styles.addMovieBtnPrimary)}
      onClick={onAddMovie}
      aria-label={primary ? undefined : label}
    >
      <Plus size={ICON_SIZE.md} aria-hidden />
      {primary ? <span className={styles.addMovieLabel}>{label}</span> : null}
    </Button>
  );
  if (primary) return button;
  return (
    <Tooltip label={label} placement="top">
      {button}
    </Tooltip>
  );
}

export default function EventDetailHeader({
  title,
  dateFormatted,
  rawDate,
  rawTime,
  isFinished,
  eventTheme,
  shareUrl,
  lifecycle,
  countdownLabel,
  participants,
  participantCount,
  moviesCount,
  votersCount,
  participantsOpen,
  onToggleParticipants,
  onOpenShare,
  onOpenSettings,
  wheelActions,
  onAddMovie,
  addMoviePrimary = true,
  addMovieTriggerRef,
  viewMode,
  onViewModeChange,
}: Readonly<EventDetailHeaderProps>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const goBack = () => {
    if (globalThis.history.length > 1) {
      navigate(-1);
    } else {
      navigate(ROUTES.home);
    }
  };
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const wheelActionsRef = useRef<HTMLDivElement>(null);
  useWheelActionsHeight(wheelActionsRef, wheelActions);
  const stickyBar = useStickyBarMedia();
  useStickyBarHeight(stickyBar, barRef);
  const condensed = useCondensedStickyBar(stickyBar, sentinelRef, barRef);

  const stacked = (participants ?? []).slice(0, MAX_STACKED_AVATARS);
  const hiddenCount = Math.max(participantCount - stacked.length, 0);
  const participantsLabel = participantsCountLabel(participantCount, t);
  const moviesLabel = pluralizeCount(
    moviesCount,
    'events.detail.moviesCountOne',
    'events.detail.moviesCount',
    t
  );
  const votersLabel = pluralizeCount(
    votersCount,
    'events.detail.votersCountOne',
    'events.detail.votersCount',
    t,
    { total: participantCount }
  );
  const isUpcoming = lifecycle === 'upcoming';
  const showLifecyclePill = lifecycle !== 'pending' && (!isUpcoming || !!countdownLabel);

  const addMovieButton = onAddMovie ? (
    <AddMovieButton
      onAddMovie={onAddMovie}
      primary={addMoviePrimary}
      label={t('movies.search.label')}
      triggerRef={addMovieTriggerRef}
    />
  ) : null;

  const utilityActions = (
    <UtilityActions
      condensed={condensed}
      isFinished={isFinished}
      shareUrl={shareUrl}
      title={title}
      rawDate={rawDate}
      rawTime={rawTime}
      onOpenShare={onOpenShare}
      onOpenSettings={onOpenSettings}
      t={t}
    />
  );

  return (
    <>
      <div className={styles.top}>
        <button
          type="button"
          className={clsx('back-link back-link-button', styles.back)}
          onClick={goBack}
        >
          <ArrowLeft size={ICON_SIZE.md} aria-hidden />
          {t('events.detail.backNav')}
        </button>
        {stickyBar ? null : utilityActions}
      </div>

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden />

      <header
        ref={barRef}
        className={styles.bar}
        data-condensed={condensed || undefined}
        data-event-sticky-bar={stickyBar || undefined}
      >
        {condensed ? (
          <button
            type="button"
            className={styles.backCondensed}
            onClick={goBack}
            aria-label={t('events.detail.backNav')}
            title={t('events.detail.backNav')}
          >
            <ArrowLeft size={ICON_SIZE.lg} aria-hidden />
          </button>
        ) : null}
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          <EventThemeBanner className={styles.theme} theme={eventTheme} />
        </div>
        {showLifecyclePill ? (
          <EventLifecyclePill
            lifecycle={lifecycle}
            label={isUpcoming ? t('events.lifecycle.startsIn') : undefined}
            detail={isUpcoming ? countdownLabel : null}
          />
        ) : null}
        {condensed ? (
          <ParticipantsStack
            participants={stacked}
            hiddenCount={hiddenCount}
            ariaLabel={participantsLabel}
            open={participantsOpen}
            onToggle={onToggleParticipants}
            testId="participants-toggle-condensed"
            bare
          />
        ) : null}

        <HeaderActions
          wheelActionsRef={wheelActionsRef}
          addMoviePrimary={addMoviePrimary}
          addMovieButton={addMovieButton}
          wheelActions={wheelActions}
          utilityActions={stickyBar ? utilityActions : null}
        />
      </header>

      <HeaderRecap
        dateFormatted={dateFormatted}
        condensed={condensed}
        stacked={stacked}
        hiddenCount={hiddenCount}
        participantsLabel={participantsLabel}
        participantsOpen={participantsOpen}
        onToggleParticipants={onToggleParticipants}
        moviesLabel={moviesLabel}
        moviesCount={moviesCount}
        votersLabel={votersLabel}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
    </>
  );
}

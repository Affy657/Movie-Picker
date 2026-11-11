import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import clsx from 'clsx';
import EventShareButton from '@/features/events/components/EventShareButton';
import EventCalendarMenu from '@/features/events/components/EventCalendarMenu';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import { useEventBack } from './useEventBack';
import ViewModeToggle from '@/shared/components/ViewModeToggle';
import AvatarStack from '@/shared/components/AvatarStack';
import type { EventParticipantSummary, MyEventLifecycle } from '@/shared/types/event';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { participantsCountLabel } from '@/features/events/utils/eventLabels';
import styles from './EventDetailHeader.module.css';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import BackLink from '@/shared/components/BackLink';

const MAX_STACKED_AVATARS = 4;
const STICKY_BAR_MEDIA = '(min-width: 48rem)';

type HeightPublisher = (height: number | null) => void;

const publishWheelBarHeight: HeightPublisher = (height) => {
  const root = document.documentElement;
  if (height === null) root.style.removeProperty('--event-wheel-bar-height');
  else root.style.setProperty('--event-wheel-bar-height', `${height}px`);
};

const publishStickyBarHeight: HeightPublisher = (height) => {
  const root = document.documentElement;
  if (height === null) root.style.removeProperty('--event-sticky-bar-height');
  else root.style.setProperty('--event-sticky-bar-height', `${height}px`);
};

function usePublishedHeight(
  enabled: boolean,
  elementRef: RefObject<HTMLElement | null>,
  publish: HeightPublisher,
  dependency: unknown
) {
  useEffect(() => {
    const el = elementRef.current;
    if (!enabled || !el || typeof ResizeObserver !== 'function') return;
    const sync = () => {
      const height = el.offsetHeight;
      publish(height > 0 ? height : null);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      publish(null);
    };
  }, [enabled, elementRef, publish, dependency]);
}

function useSentinelPassedUnderBar(
  stickyBar: boolean,
  sentinelRef: RefObject<HTMLDivElement | null>,
  barRef: RefObject<HTMLElement | null>,
  { belowBar }: { belowBar: boolean }
) {
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    if (!stickyBar) {
      setPassed(false);
      return;
    }
    const sentinel = sentinelRef.current;
    const bar = barRef.current;
    if (!sentinel || !bar || typeof IntersectionObserver !== 'function') return;
    const stickyOffsetPx = Number.parseFloat(getComputedStyle(bar).top) || 0;
    const barHeightPx = belowBar ? bar.offsetHeight : 0;
    const observer = new IntersectionObserver(([entry]) => setPassed(!entry?.isIntersecting), {
      rootMargin: `-${stickyOffsetPx + barHeightPx}px 0px 0px 0px`,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [stickyBar, sentinelRef, barRef, belowBar]);
  return passed;
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

type ParticipantsButtonProps = {
  participants: EventParticipantSummary[];
  hiddenCount: number;
  label?: string;
  ariaLabel?: string;
  onOpen: () => void;
  testId: string;
  compact?: boolean;
};

function ParticipantsButton({
  participants,
  hiddenCount,
  label,
  ariaLabel,
  onOpen,
  testId,
  compact,
}: Readonly<ParticipantsButtonProps>) {
  return (
    <button
      type="button"
      className={clsx(styles.participants, compact && styles.participantsCompact)}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
      data-testid={testId}
      data-participants-toggle
    >
      <AvatarStack
        people={participants.map((p) => ({ key: p.id, avatarId: p.avatarId, pseudo: p.pseudo }))}
        max={MAX_STACKED_AVATARS}
        hidden={hiddenCount}
      />
      {label ? <span className={styles.participantsLabel}>{label}</span> : null}
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

  onOpenParticipants: () => void;

  onOpenShare?: () => void;

  onOpenSettings?: () => void;

  actions?: ReactNode;

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

function LifecycleStatus({
  lifecycle,
  countdownLabel,
  short,
  t,
}: Readonly<{
  lifecycle: MyEventLifecycle;
  countdownLabel: string | null | undefined;
  short?: boolean;
  t: Translate;
}>) {
  if (lifecycle === 'upcoming') {
    if (!countdownLabel) return null;
    return (
      <EventLifecyclePill
        variant="text"
        lifecycle="upcoming"
        label={short ? countdownLabel : t('events.lifecycle.startsIn')}
        detail={short ? null : countdownLabel}
      />
    );
  }
  return <EventLifecyclePill variant="text" lifecycle={lifecycle} />;
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
  onOpenParticipants,
  onOpenShare,
  onOpenSettings,
  actions,
  viewMode,
  onViewModeChange,
}: Readonly<EventDetailHeaderProps>) {
  const { t } = useTranslation();
  const goBack = useEventBack();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const stickyBar = useStickyBarMedia();
  usePublishedHeight(true, actionsRef, publishWheelBarHeight, actions);
  usePublishedHeight(stickyBar, barRef, publishStickyBarHeight, stickyBar);
  const condensed = useSentinelPassedUnderBar(stickyBar, sentinelRef, barRef, { belowBar: true });
  const scrolled = useSentinelPassedUnderBar(stickyBar, topSentinelRef, barRef, {
    belowBar: false,
  });

  const stacked = (participants ?? []).slice(0, MAX_STACKED_AVATARS);
  const hiddenCount = Math.max(participantCount - stacked.length, 0);
  const participantsLabel = participantsCountLabel(participantCount, t);
  const moviesLabel = pluralizeCount(
    moviesCount,
    'events.detail.moviesCountOne',
    'events.detail.moviesCount',
    t
  );
  const theme = eventTheme?.trim();
  const showStatus = lifecycle === 'upcoming' ? !!countdownLabel : lifecycle !== 'pending';

  return (
    <>
      <span
        className={styles.accentGlow}
        data-hidden={(stickyBar && scrolled) || undefined}
        aria-hidden="true"
      />
      <div ref={topSentinelRef} className={styles.sentinel} aria-hidden />
      <header
        ref={barRef}
        className={styles.bar}
        data-condensed={condensed || undefined}
        data-at-top={(stickyBar && !scrolled) || undefined}
        data-event-sticky-bar={stickyBar || undefined}
      >
        {condensed ? (
          <>
            <IconButton size="lg" ariaLabel={t('events.detail.backNav')} onClick={goBack}>
              <ArrowLeft size={ICON_SIZE.lg} aria-hidden />
            </IconButton>
            <span className={styles.condensedTitle}>{title}</span>
            <ParticipantsButton
              participants={stacked}
              hiddenCount={hiddenCount}
              ariaLabel={participantsLabel}
              onOpen={onOpenParticipants}
              testId="participants-toggle-condensed"
              compact
            />
            {showStatus ? (
              <LifecycleStatus lifecycle={lifecycle} countdownLabel={countdownLabel} short t={t} />
            ) : null}
          </>
        ) : (
          <BackLink onClick={goBack} className={styles.backLink}>
            {t('events.detail.backNav')}
          </BackLink>
        )}
        <span className={styles.grow} aria-hidden />
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
        {actions ? (
          <div ref={actionsRef} className={styles.actions}>
            {actions}
          </div>
        ) : null}
      </header>

      <div className={styles.heading}>
        {theme ? (
          <p className={styles.theme}>
            <span className="visually-hidden">{t('events.detail.themeAria', { theme })}</span>
            <span aria-hidden="true">{theme}</span>
          </p>
        ) : null}
        <h1 className={styles.title}>{title}</h1>
      </div>

      <div className={styles.recap}>
        <span className={styles.date}>{dateFormatted}</span>
        <span className={styles.sep} aria-hidden />
        <ParticipantsButton
          participants={stacked}
          hiddenCount={hiddenCount}
          label={participantsLabel}
          onOpen={onOpenParticipants}
          testId="participants-toggle"
        />
        <span className={styles.stats}>
          <span className={styles.sep} aria-hidden />
          <span>{moviesLabel}</span>
          {showStatus ? (
            <>
              <span className={styles.sep} aria-hidden />
              <LifecycleStatus lifecycle={lifecycle} countdownLabel={countdownLabel} t={t} />
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
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
    </>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ChevronDown, Settings } from 'lucide-react';
import clsx from 'clsx';
import EventShareMenu from '@/features/events/components/EventShareMenu';
import EventCalendarMenu from '@/features/events/components/EventCalendarMenu';
import EventThemeBanner from '@/features/events/components/EventThemeBanner';
import EventLifecyclePill from '@/shared/components/EventLifecyclePill';
import Avatar from '@/shared/components/Avatar';
import type { EventParticipantSummary, MyEventLifecycle } from '@/shared/types/event';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import styles from './EventDetailHeader.module.css';

const MAX_STACKED_AVATARS = 4;
const STICKY_BAR_MEDIA = '(min-width: 48rem)';

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
    >
      {participants.length > 0 ? (
        <span className={styles.avatars} aria-hidden>
          {participants.map((p, index) => (
            <Avatar
              key={p.id}
              avatarId={p.avatarId}
              pseudo={p.pseudo}
              size={index === 0 ? 'sm' : 'xs'}
            />
          ))}
          {hiddenCount > 0 ? <span className={styles.avatarMore}>+{hiddenCount}</span> : null}
        </span>
      ) : null}
      {label ? <span className={styles.stackLabel}>{label}</span> : null}
      {bare ? null : (
        <ChevronDown
          className={styles.chevron}
          data-open={open || undefined}
          size={14}
          aria-hidden
        />
      )}
    </button>
  );
}

export type EventDetailHeaderProps = {
  title: string;
  dateFormatted: string;
  eventTime: string;
  eventDate: string;
  rawDate: string;
  rawTime: string;
  isFinished: boolean;
  eventTheme: string | null | undefined;
  eventThemeColor?: number | null;
  shareUrl: string;

  lifecycle: MyEventLifecycle;

  countdownLabel?: string | null;

  participants?: EventParticipantSummary[];

  participantCount: number;

  moviesCount: number;

  votesCount: number;

  participantsOpen: boolean;

  onToggleParticipants: () => void;

  onInviteFriends?: () => void;

  onOpenSettings?: () => void;

  wheelActions?: ReactNode;
};

export default function EventDetailHeader({
  title,
  dateFormatted,
  eventTime,
  eventDate,
  rawDate,
  rawTime,
  isFinished,
  eventTheme,
  eventThemeColor,
  shareUrl,
  lifecycle,
  countdownLabel,
  participants,
  participantCount,
  moviesCount,
  votesCount,
  participantsOpen,
  onToggleParticipants,
  onInviteFriends,
  onOpenSettings,
  wheelActions,
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
  const [stickyBar, setStickyBar] = useState(false);
  const [condensed, setCondensed] = useState(false);

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
  }, [wheelActions]);

  useEffect(() => {
    const query = globalThis.matchMedia?.(STICKY_BAR_MEDIA);
    if (!query) return;
    const sync = () => setStickyBar(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

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
  }, [stickyBar]);

  const stacked = (participants ?? []).slice(0, MAX_STACKED_AVATARS);
  const hiddenCount = Math.max(participantCount - stacked.length, 0);
  const participantsLabel =
    participantCount === 1
      ? t('events.detail.participantsToggleOne')
      : t('events.detail.participantsToggle', { count: participantCount });
  const moviesLabel =
    moviesCount === 1
      ? t('events.detail.moviesCountOne')
      : t('events.detail.moviesCount', { count: moviesCount });
  const votesLabel =
    votesCount === 1
      ? t('events.detail.votesCountOne')
      : t('events.detail.votesCount', { count: votesCount });
  const isUpcoming = lifecycle === 'upcoming';
  const showLifecyclePill = !isUpcoming || !!countdownLabel;

  return (
    <>
      <div className={styles.top}>
        <button type="button" className="back-link back-link-button" onClick={goBack}>
          <ArrowLeft size={16} aria-hidden />
          {t('events.detail.backNav')}
        </button>
      </div>
      <EventThemeBanner theme={eventTheme} themeColor={eventThemeColor} />

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden />

      <header ref={barRef} className={styles.bar} data-condensed={condensed || undefined}>
        {condensed ? (
          <button
            type="button"
            className={styles.backCondensed}
            onClick={goBack}
            aria-label={t('events.detail.backNav')}
            title={t('events.detail.backNav')}
          >
            <ArrowLeft size={18} aria-hidden />
          </button>
        ) : null}
        <h1 className={styles.title}>{title}</h1>
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

        <div className={styles.actions}>
          <div ref={wheelActionsRef} className={styles.wheelActions}>
            {wheelActions}
          </div>
          <div className={styles.utilityActions}>
            {!condensed && !isFinished && shareUrl ? (
              <>
                <EventShareMenu
                  url={shareUrl}
                  title={title}
                  eventTime={eventTime}
                  eventDate={eventDate}
                  onInviteFriends={onInviteFriends}
                />
                <EventCalendarMenu title={title} date={rawDate} time={rawTime} url={shareUrl} />
              </>
            ) : null}
            {onOpenSettings ? (
              <button
                type="button"
                className={clsx('btn', styles.settingsBtn)}
                onClick={onOpenSettings}
                aria-haspopup="dialog"
                aria-label={t('events.settings.title')}
                title={t('events.settings.title')}
              >
                <Settings size={16} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </header>

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
              <span>{votesLabel}</span>
            </>
          ) : null}
        </span>
      </div>
    </>
  );
}

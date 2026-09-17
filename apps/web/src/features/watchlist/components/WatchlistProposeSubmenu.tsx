import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ListPlus } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import { ROUTES } from '@/app/routes';
import { useEligibleEventsForPropose } from '@/features/watchlist/hooks/useEligibleEventsForPropose';
import {
  useProposeMovieToEvent,
  type ProposableMovie,
} from '@/features/watchlist/hooks/useProposeMovieToEvent';
import styles from './WatchlistProposeSubmenu.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { MenuItem, MenuPanel } from '@/shared/components/Menu';
import { MENU_ANCHOR_GAP_PX, MENU_VIEWPORT_MARGIN_PX } from '@/shared/components/menuGeometry';

type RowState = { status: 'idle' | 'pending' | 'done' | 'error'; error?: string };

const FLYOUT_WIDTH_PX = 280;
const FLYOUT_MIN_VISIBLE_HEIGHT_PX = 60;
const CLOSE_DELAY_MS = 200;

interface WatchlistProposeSubmenuProps {
  movie: ProposableMovie;
  onDone: () => void;
}

export default function WatchlistProposeSubmenu({
  movie,
  onDone,
}: Readonly<WatchlistProposeSubmenuProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedByKeyboard = useRef(false);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const propose = useProposeMovieToEvent();
  const { eligible, hasMore, isLoading } = useEligibleEventsForPropose(open);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openNow = () => {
    if (dismissedByKeyboard.current) return;
    clearCloseTimer();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const opensRight =
        rect.right + FLYOUT_WIDTH_PX + MENU_VIEWPORT_MARGIN_PX <= window.innerWidth;
      const left = opensRight
        ? rect.right + MENU_ANCHOR_GAP_PX
        : Math.max(MENU_VIEWPORT_MARGIN_PX, rect.left - FLYOUT_WIDTH_PX - MENU_ANCHOR_GAP_PX);
      const top = Math.min(rect.top, window.innerHeight - FLYOUT_MIN_VISIBLE_HEIGHT_PX);
      setPos({ top, left });
    }
    setOpen(true);
  };

  const openFromPointer = () => {
    dismissedByKeyboard.current = false;
    openNow();
  };

  const scheduleClose = () => {
    dismissedByKeyboard.current = false;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      clearCloseTimer();
      dismissedByKeyboard.current = true;
      setOpen(false);
      triggerButtonRef.current?.focus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const handlePropose = async (slug: string) => {
    setRows((prev) => ({ ...prev, [slug]: { status: 'pending' } }));
    try {
      await propose(slug, movie);
      setRows((prev) => ({ ...prev, [slug]: { status: 'done' } }));
      onDone();
    } catch (err) {
      setRows((prev) => ({
        ...prev,
        [slug]: {
          status: 'error',
          error: getErrorMessage(err, t('watchlist.propose.proposeError')),
        },
      }));
    }
  };

  return (
    <div
      ref={triggerRef}
      className={styles.trigger}
      onMouseEnter={openFromPointer}
      onMouseLeave={scheduleClose}
      onFocus={openNow}
      onBlur={scheduleClose}
    >
      <button
        ref={triggerButtonRef}
        type="button"
        className={styles.triggerBtn}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('watchlist.card.proposeAction')}
      >
        <ListPlus aria-hidden size={ICON_SIZE.sm} />
        <span className={styles.triggerLabel}>{t('watchlist.card.proposeShortLabel')}</span>
      </button>
      {open && pos && (
        <MenuPanel
          ariaLabel={t('watchlist.card.proposeAction')}
          anchored={false}
          className={styles.flyout}
          style={{
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            width: FLYOUT_WIDTH_PX,
          }}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          onFocus={clearCloseTimer}
          onBlur={scheduleClose}
        >
          {isLoading && <p className={styles.hint}>{t('common.loading')}</p>}
          {!isLoading && eligible.length === 0 && (
            <p className={styles.hint}>{t('watchlist.propose.noEvents')}</p>
          )}
          {!isLoading &&
            eligible.map((e) => {
              const row = rows[e.slug] ?? { status: 'idle' as const };
              const isDone = row.status === 'done';
              return (
                <div key={e.slug} className={styles.row}>
                  <MenuItem
                    onClick={() => handlePropose(e.slug)}
                    disabled={row.status === 'pending' || isDone}
                    selected={isDone}
                  >
                    {e.title}
                  </MenuItem>
                  {row.status === 'pending' && (
                    <p className={styles.rowStatus}>{t('common.loading')}</p>
                  )}
                  {isDone && (
                    <p className={styles.rowDone}>{t('watchlist.propose.proposedDone')}</p>
                  )}
                  {row.status === 'error' && (
                    <p className={styles.rowError} role="alert">
                      {row.error}
                    </p>
                  )}
                </div>
              );
            })}
          {hasMore && (
            <Link to={ROUTES.myEvents} className={styles.viewMoreLink}>
              {t('watchlist.propose.viewMore')}
            </Link>
          )}
        </MenuPanel>
      )}
    </div>
  );
}

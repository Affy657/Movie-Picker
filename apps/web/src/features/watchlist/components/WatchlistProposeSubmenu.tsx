import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ListPlus } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import { ROUTES } from '@/app/routes';
import { useEligibleEventsForPropose } from '@/features/watchlist/hooks/useEligibleEventsForPropose';
import { useProposeMovieToEvent } from '@/features/watchlist/hooks/useProposeMovieToEvent';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';
import kebabStyles from '@/features/movies/components/movieCardParts.module.css';
import styles from './WatchlistProposeSubmenu.module.css';

type RowState = { status: 'idle' | 'pending' | 'done' | 'error'; error?: string };

const FLYOUT_WIDTH = 280;
const CLOSE_DELAY_MS = 200;

interface WatchlistProposeSubmenuProps {
  movie: WatchlistItem;
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
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    clearCloseTimer();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const opensRight = rect.right + FLYOUT_WIDTH + 8 <= window.innerWidth;
      const left = opensRight ? rect.right + 6 : Math.max(8, rect.left - FLYOUT_WIDTH - 6);
      const top = Math.min(rect.top, window.innerHeight - 60);
      setPos({ top, left });
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearCloseTimer(), []);

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
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
      onFocus={openNow}
      onBlur={scheduleClose}
    >
      <button
        type="button"
        className={kebabStyles.kebabBtn}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('watchlist.card.proposeAction')}
      >
        <ListPlus aria-hidden size={16} />
      </button>
      {open && pos && (
        <div
          className={styles.flyout}
          role="menu"
          style={{
            position: 'fixed',
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            width: FLYOUT_WIDTH,
            zIndex: 10000,
          }}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          onFocus={clearCloseTimer}
          onBlur={scheduleClose}
        >
          {isLoading ? (
            <p className={styles.hint}>{t('common.loading')}</p>
          ) : eligible.length === 0 ? (
            <p className={styles.hint}>{t('watchlist.propose.noEvents')}</p>
          ) : (
            <ul className={styles.list}>
              {eligible.map((e) => {
                const row = rows[e.slug] ?? { status: 'idle' as const };
                const isDone = row.status === 'done';
                return (
                  <li key={e.slug}>
                    <button
                      type="button"
                      className={styles.eventRow}
                      onClick={() => handlePropose(e.slug)}
                      disabled={row.status === 'pending' || isDone}
                    >
                      {e.title}
                    </button>
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
                  </li>
                );
              })}
            </ul>
          )}
          {hasMore && (
            <Link to={ROUTES.myEvents} className={styles.viewMoreLink}>
              {t('watchlist.propose.viewMore')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

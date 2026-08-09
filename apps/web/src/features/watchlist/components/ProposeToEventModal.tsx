import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import { ROUTES } from '@/app/routes';
import {
  EventSummaryCardBody,
  eventSummaryCardStyles,
} from '@/features/events/components/EventSummaryCard';
import { useEligibleEventsForPropose } from '@/features/watchlist/hooks/useEligibleEventsForPropose';
import { useProposeMovieToEvent } from '@/features/watchlist/hooks/useProposeMovieToEvent';
import type { WatchlistItem } from '@/features/watchlist/api/watchlistApi';
import styles from './ProposeToEventModal.module.css';

type RowState = { status: 'idle' | 'pending' | 'done' | 'error'; error?: string };

interface ProposeToEventModalProps {
  open: boolean;
  movie: WatchlistItem;
  onClose: () => void;
}

export default function ProposeToEventModal({
  open,
  movie,
  onClose,
}: Readonly<ProposeToEventModalProps>) {
  const { t } = useTranslation();
  const dialogRef = useModalDialog(open, onClose);
  const titleId = useId();
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const propose = useProposeMovieToEvent();
  const { eligible, hasMore, isLoading } = useEligibleEventsForPropose(open);

  const handlePropose = async (slug: string) => {
    setRows((prev) => ({ ...prev, [slug]: { status: 'pending' } }));
    try {
      await propose(slug, movie);
      setRows((prev) => ({ ...prev, [slug]: { status: 'done' } }));
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
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t('watchlist.propose.modalTitle', { title: movie.title })}
        </h2>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X aria-hidden size={18} />
        </button>
      </div>

      {isLoading ? (
        <p className="placeholder">{t('common.loading')}</p>
      ) : eligible.length === 0 ? (
        <p className={styles.empty}>{t('watchlist.propose.noEvents')}</p>
      ) : (
        <ul className={styles.list}>
          {eligible.map((e) => {
            const row = rows[e.slug] ?? { status: 'idle' as const };
            const isDone = row.status === 'done';
            return (
              <li key={e.slug} className={styles.row}>
                <button
                  type="button"
                  className={eventSummaryCardStyles.card}
                  onClick={() => handlePropose(e.slug)}
                  disabled={row.status === 'pending' || isDone}
                >
                  <EventSummaryCardBody event={e} showLifecycleBadge={false} />
                </button>
                <div className={styles.rowStatus}>
                  {row.status === 'pending' && <span>{t('common.loading')}</span>}
                  {isDone && (
                    <span className={styles.rowDone}>{t('watchlist.propose.proposedDone')}</span>
                  )}
                  {row.status === 'error' && (
                    <span className={styles.rowError} role="alert">
                      {row.error}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore ? (
        <Link to={ROUTES.myEvents} className={styles.viewMoreLink} onClick={onClose}>
          {t('watchlist.propose.viewMore')}
        </Link>
      ) : null}
    </dialog>
  );
}

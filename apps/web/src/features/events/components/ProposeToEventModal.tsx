import { useId, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import { ROUTES } from '@/app/routes';
import {
  EventSummaryCardBody,
  eventSummaryCardStyles,
} from '@/features/events/components/EventSummaryCard';
import { useEligibleEventsForPropose } from '@/features/events/hooks/useEligibleEventsForPropose';
import {
  useProposeMovieToEvent,
  type ProposableMovie,
} from '@/features/events/hooks/useProposeMovieToEvent';
import styles from './ProposeToEventModal.module.css';
import Modal from '@/shared/components/Modal';
import Card from '@/shared/components/Card';
import EmptyState from '@/shared/components/EmptyState';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { CalendarX } from 'lucide-react';

type RowState = { status: 'idle' | 'pending' | 'done' | 'error'; error?: string };

interface ProposeToEventModalProps {
  open: boolean;
  movie: ProposableMovie;
  onClose: () => void;
}

export default function ProposeToEventModal({
  open,
  movie,
  onClose,
}: Readonly<ProposeToEventModalProps>) {
  const { t } = useTranslation();
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
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      column
      title={t('watchlist.propose.modalTitle', { title: movie.title })}
      titleId={titleId}
    >
      {isLoading && <p className="placeholder">{t('common.loading')}</p>}
      {!isLoading && eligible.length === 0 && (
        <EmptyState
          compact
          icon={<CalendarX aria-hidden size={ICON_SIZE['2xl']} />}
          message={t('watchlist.propose.noEvents')}
        />
      )}
      {!isLoading && eligible.length > 0 && (
        <ul className={styles.list}>
          {eligible.map((e) => {
            const row = rows[e.slug] ?? { status: 'idle' as const };
            const isDone = row.status === 'done';
            return (
              <li key={e.slug} className={styles.row}>
                <Card
                  as="button"
                  type="button"
                  interactive
                  elevation="sm"
                  padding="none"
                  className={eventSummaryCardStyles.card}
                  onClick={() => handlePropose(e.slug)}
                  disabled={row.status === 'pending' || isDone}
                >
                  <EventSummaryCardBody event={e} />
                </Card>
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
    </Modal>
  );
}

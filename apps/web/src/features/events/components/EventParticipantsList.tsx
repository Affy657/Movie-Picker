import clsx from 'clsx';
import { Users } from 'lucide-react';
import type { EventParticipantSummary } from '@/shared/types/event';
import { useTranslation } from '@/shared/i18n';
import styles from './EventParticipantsList.module.css';

type Props = {
  participants: EventParticipantSummary[] | undefined;
  currentParticipantId: string | null | undefined;
  /** Capacité maximale (hôte inclus). `null`/`undefined` = pas de limite. */
  maxParticipants?: number | null;
};

export default function EventParticipantsList({
  participants,
  currentParticipantId,
  maxParticipants,
}: Props) {
  const { t } = useTranslation();
  if (!participants) return null;

  const hasCap = typeof maxParticipants === 'number' && maxParticipants > 0;
  const countLabel = hasCap
    ? `${participants.length} / ${maxParticipants}`
    : String(participants.length);
  const isFull = hasCap && participants.length >= (maxParticipants ?? 0);

  return (
    <section
      className={styles.root}
      aria-labelledby="participants-heading"
      data-testid="event-participants"
    >
      <h2 id="participants-heading" className={styles.header}>
        <Users aria-hidden size={18} />
        {t('events.participants.title')}
        <span className={styles.count}>({countLabel})</span>
        {isFull && (
          <span className={styles.fullBadge} aria-label={t('events.participants.fullBadgeAria')}>
            {t('events.participants.fullBadge')}
          </span>
        )}
      </h2>
      {participants.length === 0 ? (
        <p className={styles.empty}>{t('events.participants.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {participants.map((p) => (
            <li
              key={p.id}
              className={clsx(styles.chip, p.id === currentParticipantId && styles.chipMe)}
            >
              {p.pseudo}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

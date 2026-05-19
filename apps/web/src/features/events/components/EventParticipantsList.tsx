import clsx from 'clsx';
import { Crown, Users, X } from 'lucide-react';
import type { EventParticipantSummary } from '@/shared/types/event';
import { useTranslation } from '@/shared/i18n';
import styles from './EventParticipantsList.module.css';

type Props = {
  participants: EventParticipantSummary[] | undefined;
  currentParticipantId: string | null | undefined;

  maxParticipants?: number | null;

  isHost?: boolean;

  pendingRemovalId?: string | null;

  onRemoveParticipant?: (participantId: string, pseudo: string) => void;
};

export default function EventParticipantsList({
  participants,
  currentParticipantId,
  maxParticipants,
  isHost,
  pendingRemovalId,
  onRemoveParticipant,
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
        <Users aria-hidden size={18} className={styles.headerIcon} />
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
          {participants.map((p) => {
            const isMe = p.id === currentParticipantId;
            const isCreator = !!p.isCreator;
            const canHostRemove = !!isHost && !!onRemoveParticipant && !isCreator && !isMe;
            const isPending = pendingRemovalId === p.id;

            return (
              <li
                key={p.id}
                className={clsx(styles.chip, isMe && styles.chipMe)}
                data-testid={`participant-${p.id}`}
              >
                <span className={styles.chipLabel}>{p.pseudo}</span>
                {isCreator && (
                  <span
                    className={styles.hostBadge}
                    aria-label={t('events.participants.hostBadge')}
                    title={t('events.participants.hostBadge')}
                  >
                    <Crown aria-hidden size={12} />
                  </span>
                )}
                {canHostRemove && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    aria-label={t('events.participants.removeAriaLabel', { pseudo: p.pseudo })}
                    title={t('events.participants.removeAction')}
                    disabled={isPending}
                    onClick={() => onRemoveParticipant!(p.id, p.pseudo)}
                    data-testid={`remove-participant-${p.id}`}
                  >
                    <X aria-hidden size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

import { useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { Check, Crown, Settings2, UserPlus, Users, X } from 'lucide-react';
import type { EventParticipantSummary } from '@/shared/types/event';
import { useTranslation } from '@/shared/i18n';
import Chip from '@/shared/components/Chip';
import { ROUTES } from '@/app/routes';
import Avatar from '@/shared/components/Avatar';
import EmptyState from '@/shared/components/EmptyState';
import styles from './EventParticipantsList.module.css';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';

type Props = {
  participants: EventParticipantSummary[] | undefined;
  currentParticipantId: string | null | undefined;

  maxParticipants?: number | null;

  isHost?: boolean;

  pendingRemovalId?: string | null;

  onRemoveParticipant?: (participantId: string, pseudo: string) => void;

  onInvite?: () => void;

  onLeave?: () => void;

  leaveDisabled?: boolean;
};

export default function EventParticipantsList({
  participants,
  currentParticipantId,
  maxParticipants,
  isHost,
  pendingRemovalId,
  onRemoveParticipant,
  onInvite,
  onLeave,
  leaveDisabled,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [managing, setManaging] = useState(false);
  if (!participants) return null;

  const hasCap = typeof maxParticipants === 'number' && maxParticipants > 0;
  const countLabel = hasCap
    ? `${participants.length} / ${maxParticipants}`
    : String(participants.length);
  const isFull = hasCap && participants.length >= (maxParticipants ?? 0);
  const canManage = !!isHost && !!onRemoveParticipant && participants.length > 1;

  return (
    <Card
      as="section"
      elevation="sm"
      id="event-participants-panel"
      className={styles.root}
      aria-labelledby="participants-heading"
      data-testid="event-participants"
    >
      <div className={styles.headerRow}>
        <h2 id="participants-heading" className={styles.header}>
          <Users aria-hidden size={ICON_SIZE.lg} className={styles.headerIcon} />
          <span className={styles.headerLabel}>{t('events.participants.title')}</span>
          <span className={styles.count}>({countLabel})</span>
          {isFull && (
            <Chip
              tone="warning"
              size="sm"
              className={styles.fullBadge}
              label={t('events.participants.fullBadgeAria')}
            >
              {t('events.participants.fullBadge')}
            </Chip>
          )}
        </h2>
        {canManage && (
          <Button
            type="button"
            size="sm"
            className={styles.manageBtn}
            onClick={() => setManaging((value) => !value)}
            aria-pressed={managing}
            data-testid="manage-participants-toggle"
          >
            {managing ? (
              <>
                <Check aria-hidden size={ICON_SIZE.sm} />
                <span className={styles.manageBtnLabel}>{t('events.participants.manageDone')}</span>
              </>
            ) : (
              <>
                <Settings2 aria-hidden size={ICON_SIZE.sm} />
                <span className={styles.manageBtnLabel}>
                  {t('events.participants.manageAction')}
                </span>
              </>
            )}
          </Button>
        )}
      </div>

      {participants.length === 0 && !onInvite ? (
        <EmptyState
          compact
          icon={<UserPlus size={ICON_SIZE['2xl']} aria-hidden />}
          message={t('events.participants.empty')}
        />
      ) : (
        <ul className={styles.list}>
          {participants.map((p) => {
            const isMe = p.id === currentParticipantId;
            const isCreator = !!p.isCreator;
            const canHostRemove = !!isHost && !!onRemoveParticipant && !isCreator && !isMe;
            const isPending = pendingRemovalId === p.id;
            const identity = (
              <>
                <Avatar avatarId={p.avatarId} pseudo={p.pseudo} size="xs" />
                <span className={styles.chipLabel}>{p.pseudo}</span>
              </>
            );

            return (
              <li
                key={p.id}
                className={clsx(styles.chip, isMe && styles.chipMe)}
                data-testid={`participant-${p.id}`}
              >
                {p.handle ? (
                  <Link
                    to={ROUTES.profile(p.handle)}
                    className={styles.profileLink}
                    aria-label={t('events.participants.viewProfileAriaLabel', { pseudo: p.pseudo })}
                  >
                    {identity}
                  </Link>
                ) : (
                  identity
                )}
                {isCreator && (
                  <span
                    className={styles.hostBadge}
                    role="img"
                    aria-label={t('events.participants.hostBadge')}
                    title={t('events.participants.hostBadge')}
                  >
                    <Crown aria-hidden size={ICON_SIZE.xs} />
                  </span>
                )}
                {managing && canHostRemove && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    aria-label={t('events.participants.removeAriaLabel', { pseudo: p.pseudo })}
                    title={t('events.participants.removeAction')}
                    disabled={isPending}
                    onClick={() => onRemoveParticipant(p.id, p.pseudo)}
                    data-testid={`remove-participant-${p.id}`}
                  >
                    <X aria-hidden size={ICON_SIZE.sm} />
                  </button>
                )}
              </li>
            );
          })}
          {onInvite && (
            <li>
              <Chip
                icon={UserPlus}
                className={styles.inviteChip}
                onClick={onInvite}
                label={t('events.participants.inviteAriaLabel')}
              >
                {t('events.participants.inviteAction')}
              </Chip>
            </li>
          )}
        </ul>
      )}

      {onLeave && (
        <div className={styles.leaveRow}>
          <Button
            type="button"
            tone="danger"
            size="sm"
            onClick={onLeave}
            disabled={leaveDisabled}
            data-testid="leave-event-button"
          >
            {t('events.participants.leaveAction')}
          </Button>
        </div>
      )}
    </Card>
  );
}

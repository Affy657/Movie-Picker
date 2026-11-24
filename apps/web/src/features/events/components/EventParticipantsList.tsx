import { Crown, UserMinus, UserPlus } from 'lucide-react';
import type { EventParticipantSummary } from '@/shared/types/event';
import { useTranslation } from '@/shared/i18n';
import { withElision } from '@/shared/i18n/withElision';
import Avatar from '@/shared/components/Avatar';
import Chip from '@/shared/components/Chip';
import EmptyState from '@/shared/components/EmptyState';
import IconButton from '@/shared/components/IconButton';
import PersonRow from '@/shared/components/PersonRow';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ROUTES } from '@/app/routes';
import styles from './EventParticipantsList.module.css';

type Props = {
  participants: EventParticipantSummary[] | undefined;
  currentParticipantId: string | null | undefined;
  isHost?: boolean;
  pendingRemovalId?: string | null;
  onRemoveParticipant?: (participantId: string, pseudo: string) => void;
  onlineIds?: ReadonlySet<string>;
  proposingIds?: ReadonlySet<string>;
};

export default function EventParticipantsList({
  participants,
  currentParticipantId,
  isHost,
  pendingRemovalId,
  onRemoveParticipant,
  onlineIds,
  proposingIds,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!participants) return null;

  if (participants.length === 0) {
    return (
      <EmptyState
        compact
        icon={<UserPlus size={ICON_SIZE['2xl']} aria-hidden />}
        message={t('events.participants.empty')}
      />
    );
  }

  return (
    <ul className={styles.list} data-testid="event-participants">
      {participants.map((p) => {
        const isMe = p.id === currentParticipantId;
        const isCreator = !!p.isCreator;
        const canHostRemove = !!isHost && !!onRemoveParticipant && !isCreator && !isMe;
        const isProposing = proposingIds?.has(p.id) ?? false;
        const isOnline = isProposing || (onlineIds?.has(p.id) ?? false);
        const presenceLabel = t(
          isProposing ? 'events.participants.proposing' : 'events.participants.online'
        );
        const states = [
          isCreator ? t('events.participants.hostBadge') : null,
          isMe ? t('events.participants.youState') : null,
          isOnline ? presenceLabel : null,
        ].filter((state): state is string => state !== null);
        const profileLinkLabel =
          states.length > 0
            ? withElision(
                p.pseudo,
                'events.participants.viewProfilePresenceAriaLabel',
                'events.participants.viewProfilePresenceAriaLabelElided',
                t,
                { presence: states.join(', ') }
              )
            : withElision(
                p.pseudo,
                'events.participants.viewProfileAriaLabel',
                'events.participants.viewProfileAriaLabelElided',
                t
              );

        return (
          <PersonRow
            key={p.id}
            data-testid={`participant-${p.id}`}
            avatar={
              <Avatar
                avatarId={p.avatarId}
                pseudo={p.pseudo}
                size="md"
                accent={p.accentColor}
                halo={isProposing}
              />
            }
            name={p.pseudo}
            badges={
              <>
                {isCreator ? (
                  <span
                    className={styles.hostBadge}
                    role="img"
                    aria-label={t('events.participants.hostBadge')}
                    title={t('events.participants.hostBadge')}
                  >
                    <Crown aria-hidden size={ICON_SIZE.md} />
                  </span>
                ) : null}
                {isMe ? <Chip size="sm">{t('events.participants.youBadge')}</Chip> : null}
                {isOnline ? <span className="visually-hidden">{presenceLabel}</span> : null}
              </>
            }
            online={isOnline}
            to={p.handle ? ROUTES.profile(p.handle) : undefined}
            linkAriaLabel={p.handle ? profileLinkLabel : undefined}
            className={styles.row}
            action={
              canHostRemove ? (
                <IconButton
                  tone="danger"
                  className={styles.remove}
                  ariaLabel={t('events.participants.removeAriaLabel', { pseudo: p.pseudo })}
                  disabled={pendingRemovalId === p.id}
                  onClick={() => onRemoveParticipant(p.id, p.pseudo)}
                  data-testid={`remove-participant-${p.id}`}
                >
                  <UserMinus aria-hidden size={ICON_SIZE.xl} />
                </IconButton>
              ) : null
            }
          />
        );
      })}
    </ul>
  );
}

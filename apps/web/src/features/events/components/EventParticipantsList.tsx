import { useEffect, useId, useRef } from 'react';
import clsx from 'clsx';
import { Crown, ShieldMinus, ShieldPlus, UserMinus, UserPlus } from 'lucide-react';
import type { EventParticipantSummary, RemovedPerson } from '@/shared/types/event';
import { useTranslation, type Translate } from '@/shared/i18n';
import { withElision } from '@/shared/i18n/withElision';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
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
  viewerIsCreator?: boolean;
  pendingCoHostId?: string | null;
  onToggleCoHost?: (participantId: string, coHost: boolean) => void;
  coHostNamingClosed?: boolean;
  onlineIds?: ReadonlySet<string>;
  proposingIds?: ReadonlySet<string>;
  removedPeople?: RemovedPerson[];
  pendingLetBackInId?: string | null;
  onLetBackIn?: (userId: string, name: string) => void;
  outcome?: ParticipantsOutcome | null;
};

export type ParticipantsOutcome = { kind: 'removed' | 'letBackIn'; message: string };

export default function EventParticipantsList({
  participants,
  currentParticipantId,
  isHost,
  pendingRemovalId,
  onRemoveParticipant,
  viewerIsCreator = false,
  pendingCoHostId,
  onToggleCoHost,
  coHostNamingClosed = false,
  onlineIds,
  proposingIds,
  removedPeople,
  pendingLetBackInId,
  onLetBackIn,
  outcome = null,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!participants) return null;

  const keepRemovedSection = outcome?.kind === 'letBackIn';
  const removed =
    isHost && onLetBackIn && removedPeople && (removedPeople.length > 0 || keepRemovedSection) ? (
      <RemovedPeopleList
        people={removedPeople}
        pendingId={pendingLetBackInId ?? null}
        onLetBackIn={onLetBackIn}
      />
    ) : null;
  const announcement = (
    <output className={styles.outcome} data-testid="participants-action-success">
      {outcome?.message}
    </output>
  );

  if (participants.length === 0) {
    return (
      <>
        <EmptyState
          compact
          icon={<UserPlus size={ICON_SIZE['2xl']} aria-hidden />}
          message={t('events.participants.empty')}
        />
        {removed}
        {announcement}
      </>
    );
  }

  return (
    <>
      <ParticipantRows
        participants={participants}
        currentParticipantId={currentParticipantId}
        isHost={isHost}
        pendingRemovalId={pendingRemovalId}
        onRemoveParticipant={onRemoveParticipant}
        viewerIsCreator={viewerIsCreator}
        pendingCoHostId={pendingCoHostId}
        onToggleCoHost={onToggleCoHost}
        coHostNamingClosed={coHostNamingClosed}
        onlineIds={onlineIds}
        proposingIds={proposingIds}
      />
      {removed}
      {announcement}
    </>
  );
}

type Leaving = { id: string; order: readonly string[] };

function neighbourOf(
  leaving: Leaving,
  targetOf: (id: string) => HTMLElement | undefined
): HTMLElement | undefined {
  const index = leaving.order.indexOf(leaving.id);
  const after = leaving.order.slice(index + 1);
  const before = leaving.order.slice(0, Math.max(index, 0)).reverse();
  return [...after, ...before].map(targetOf).find((target) => target !== undefined);
}

function focusIsLost(): boolean {
  const active = document.activeElement;
  return active === null || active === document.body || active instanceof HTMLDialogElement;
}

function useFocusAfterLeaving<Fallback extends HTMLElement>(items: readonly { id: string }[]) {
  const fallbackRef = useRef<Fallback>(null);
  const targets = useRef(new Map<string, HTMLElement>());
  const leaving = useRef<Leaving | null>(null);
  const targetRef = (id: string) => (element: HTMLElement | null) => {
    if (element) targets.current.set(id, element);
    else targets.current.delete(id);
  };
  const markLeaving = (id: string) => {
    leaving.current = { id, order: items.map((item) => item.id) };
  };
  useEffect(() => {
    const pending = leaving.current;
    if (!pending || items.some((item) => item.id === pending.id)) return;
    leaving.current = null;
    if (!focusIsLost()) return;
    (neighbourOf(pending, (id) => targets.current.get(id)) ?? fallbackRef.current)?.focus();
  }, [items]);
  return { fallbackRef, targetRef, markLeaving };
}

function RemovedPeopleList({
  people,
  pendingId,
  onLetBackIn,
}: Readonly<{
  people: RemovedPerson[];
  pendingId: string | null;
  onLetBackIn: (userId: string, name: string) => void;
}>) {
  const { t } = useTranslation();
  const titleId = useId();
  const focus = useFocusAfterLeaving<HTMLHeadingElement>(people);
  return (
    <section className={styles.removed}>
      <h3 id={titleId} ref={focus.fallbackRef} tabIndex={-1} className={styles.removedTitle}>
        {t('events.participants.removedTitle')}
      </h3>
      {people.length > 0 ? (
        <>
          <p className={styles.removedHint}>{t('events.participants.removedHint')}</p>
          <ul
            className={clsx(styles.list, styles.removedList)}
            aria-labelledby={titleId}
            data-testid="event-removed-people"
          >
            {people.map((person) => {
              const name = person.displayName || person.handle || '';
              return (
                <PersonRow
                  key={person.id}
                  data-testid={`removed-person-${person.id}`}
                  muted
                  avatar={
                    <Avatar
                      avatarId={person.avatarId}
                      pseudo={name}
                      size="md"
                      accent={person.accentColor}
                    />
                  }
                  name={name}
                  to={person.handle ? ROUTES.profile(person.handle) : undefined}
                  linkAriaLabel={person.handle ? profileLinkLabelOf(name, [], t) : undefined}
                  className={styles.row}
                  action={
                    <Button
                      ref={focus.targetRef(person.id)}
                      variant="secondary"
                      size="sm"
                      aria-label={t('events.participants.letBackInAriaLabel', { name })}
                      disabled={pendingId === person.id}
                      onClick={() => {
                        focus.markLeaving(person.id);
                        onLetBackIn(person.id, name);
                      }}
                    >
                      {t('events.participants.letBackIn')}
                    </Button>
                  }
                />
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function ParticipantRows({
  participants,
  currentParticipantId,
  isHost,
  pendingRemovalId,
  onRemoveParticipant,
  viewerIsCreator = false,
  pendingCoHostId,
  onToggleCoHost,
  coHostNamingClosed = false,
  onlineIds,
  proposingIds,
}: Readonly<
  Omit<
    Props,
    'participants' | 'removedPeople' | 'pendingLetBackInId' | 'onLetBackIn' | 'outcome'
  > & {
    participants: EventParticipantSummary[];
  }
>) {
  const { t } = useTranslation();
  const focus = useFocusAfterLeaving(participants);
  const removeParticipant = onRemoveParticipant
    ? (participantId: string, pseudo: string) => {
        focus.markLeaving(participantId);
        onRemoveParticipant(participantId, pseudo);
      }
    : undefined;
  return (
    <ul className={styles.list} data-testid="event-participants">
      {participants.map((p) => {
        const isMe = p.id === currentParticipantId;
        const isCreator = !!p.isCreator;
        const isCoHost = !!p.isCoHost;
        const canHostRemove =
          !!isHost &&
          !!onRemoveParticipant &&
          !isCreator &&
          !isMe &&
          (viewerIsCreator || !isCoHost);
        const canToggleCoHost =
          !!onToggleCoHost && !isCreator && !isMe && (isCoHost || !coHostNamingClosed);
        const isProposing = proposingIds?.has(p.id) ?? false;
        const isOnline = isProposing || (onlineIds?.has(p.id) ?? false);
        const presenceLabel = t(
          isProposing ? 'events.participants.proposing' : 'events.participants.online'
        );
        const states = [
          isCreator ? t('events.participants.hostBadge') : null,
          isCoHost ? t('events.participants.coHostState') : null,
          isMe ? t('events.participants.youState') : null,
          isOnline ? presenceLabel : null,
        ].filter((state): state is string => state !== null);

        return (
          <PersonRow
            key={p.id}
            data-testid={`participant-${p.id}`}
            rowRef={focus.targetRef(p.id)}
            tabIndex={-1}
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
              <ParticipantBadges
                isCreator={isCreator}
                isCoHost={isCoHost}
                isMe={isMe}
                presenceLabel={isOnline ? presenceLabel : null}
              />
            }
            online={isOnline}
            to={p.handle ? ROUTES.profile(p.handle) : undefined}
            linkAriaLabel={p.handle ? profileLinkLabelOf(p.pseudo, states, t) : undefined}
            className={styles.row}
            action={
              canToggleCoHost || canHostRemove ? (
                <ParticipantActions
                  participant={p}
                  onToggleCoHost={canToggleCoHost ? onToggleCoHost : undefined}
                  coHostPending={pendingCoHostId === p.id}
                  onRemove={canHostRemove ? removeParticipant : undefined}
                  removalPending={pendingRemovalId === p.id}
                />
              ) : null
            }
          />
        );
      })}
    </ul>
  );
}

function ParticipantBadges({
  isCreator,
  isCoHost,
  isMe,
  presenceLabel,
}: Readonly<{
  isCreator: boolean;
  isCoHost: boolean;
  isMe: boolean;
  presenceLabel: string | null;
}>) {
  const { t } = useTranslation();
  return (
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
      {isCoHost ? <Chip size="sm">{t('events.participants.coHostBadge')}</Chip> : null}
      {isMe ? <Chip size="sm">{t('events.participants.youBadge')}</Chip> : null}
      {presenceLabel ? <span className="visually-hidden">{presenceLabel}</span> : null}
    </>
  );
}

function profileLinkLabelOf(pseudo: string, states: string[], t: Translate): string {
  if (states.length === 0) {
    return withElision(
      pseudo,
      'events.participants.viewProfileAriaLabel',
      'events.participants.viewProfileAriaLabelElided',
      t
    );
  }
  return withElision(
    pseudo,
    'events.participants.viewProfilePresenceAriaLabel',
    'events.participants.viewProfilePresenceAriaLabelElided',
    t,
    { presence: states.join(', ') }
  );
}

function ParticipantActions({
  participant,
  onToggleCoHost,
  coHostPending,
  onRemove,
  removalPending,
}: Readonly<{
  participant: EventParticipantSummary;
  onToggleCoHost?: (participantId: string, coHost: boolean) => void;
  coHostPending: boolean;
  onRemove?: (participantId: string, pseudo: string) => void;
  removalPending: boolean;
}>) {
  const { t } = useTranslation();
  const isCoHost = !!participant.isCoHost;
  const { id, pseudo } = participant;

  return (
    <>
      {onToggleCoHost ? (
        <IconButton
          className={styles.coHost}
          ariaLabel={t(
            isCoHost
              ? 'events.participants.withdrawCoHostAriaLabel'
              : 'events.participants.nameCoHostAriaLabel',
            { pseudo }
          )}
          disabled={coHostPending}
          onClick={() => onToggleCoHost(id, !isCoHost)}
          data-testid={`co-host-${id}`}
        >
          {isCoHost ? (
            <ShieldMinus aria-hidden size={ICON_SIZE.xl} />
          ) : (
            <ShieldPlus aria-hidden size={ICON_SIZE.xl} />
          )}
        </IconButton>
      ) : null}
      {onRemove ? (
        <IconButton
          tone="danger"
          className={styles.remove}
          ariaLabel={t('events.participants.removeAriaLabel', { pseudo })}
          disabled={removalPending}
          onClick={() => onRemove(id, pseudo)}
          data-testid={`remove-participant-${id}`}
        >
          <UserMinus aria-hidden size={ICON_SIZE.xl} />
        </IconButton>
      ) : null}
    </>
  );
}

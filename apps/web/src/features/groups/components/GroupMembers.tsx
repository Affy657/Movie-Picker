import { useId } from 'react';
import Avatar from '@/shared/components/Avatar';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import CountBadge from '@/shared/components/CountBadge';
import LinkButton from '@/shared/components/LinkButton';
import { useLocale, useTranslation } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import type { FriendGroupDetail, FriendGroupMember } from '@/features/groups/api/groupsApi';
import { splitUpcomingNights } from '@/features/groups/utils/groupNights';
import styles from './GroupMembers.module.css';

function weekdayOf(isoDate: string, locale: LocaleCode): string | null {
  const [year, month, day] = isoDate.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return null;
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(
    new Date(year, month - 1, day)
  );
}

function useMembersPresence(group: FriendGroupDetail, viewerId: string | undefined) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { next } = splitUpcomingNights(group.upcomingNights);
  const day = next ? weekdayOf(next.date, locale) : null;
  const coming = new Set(group.nextNightParticipantIds);
  const members = [...group.members].sort(
    (a, b) => Number(b.role === 'owner') - Number(a.role === 'owner')
  );
  return {
    day,
    members,
    comes: (member: FriendGroupMember) => day !== null && coming.has(member.userId),
    nameOf: (member: FriendGroupMember) =>
      member.userId === viewerId ? t('groups.members.you') : member.displayName,
    presenceOf: (member: FriendGroupMember) => {
      if (day === null) return null;
      return coming.has(member.userId)
        ? t('groups.page.comes', { day })
        : t('groups.page.notJoined');
    },
  };
}

type GroupMembersProps = Readonly<{
  group: FriendGroupDetail;
  viewerId: string | undefined;
  onLeave?: () => void;
}>;

function MembersHeading({ id, count }: Readonly<{ id: string; count: number }>) {
  const { t } = useTranslation();
  return (
    <h2 id={id} className={styles.heading}>
      {t('groups.page.members')} <CountBadge value={count} tone="neutral" />
    </h2>
  );
}

export function GroupMembersAside({ group, viewerId, onLeave }: GroupMembersProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const presence = useMembersPresence(group, viewerId);
  return (
    <Card as="aside" padding="md" radius="lg" className={styles.aside} aria-labelledby={headingId}>
      <MembersHeading id={headingId} count={group.members.length} />
      <ul className={styles.rows}>
        {presence.members.map((member) => {
          const line = presence.presenceOf(member);
          return (
            <li key={member.userId} className={styles.row}>
              <Avatar avatarId={member.avatarId} pseudo={member.displayName} size="md" />
              <span className={styles.rowText}>
                <span className={styles.name}>{presence.nameOf(member)}</span>
                {line ? (
                  <span className={presence.comes(member) ? styles.comes : styles.absent}>
                    {line}
                  </span>
                ) : null}
              </span>
              {member.role === 'owner' ? (
                <Chip size="sm">{t('groups.members.ownerBadge')}</Chip>
              ) : null}
            </li>
          );
        })}
      </ul>
      {onLeave ? (
        <LinkButton size="sm" className={styles.leave} onClick={onLeave}>
          {t('groups.page.leave')}
        </LinkButton>
      ) : null}
    </Card>
  );
}

export function GroupMembersStrip({ group, viewerId }: GroupMembersProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const presence = useMembersPresence(group, viewerId);
  return (
    <section className={styles.strip} aria-labelledby={headingId}>
      <MembersHeading id={headingId} count={group.members.length} />
      <ul className={styles.avatars}>
        {presence.members.map((member) => {
          const line = presence.presenceOf(member);
          return (
            <li key={member.userId} className={styles.person}>
              <span className={styles.ring} data-comes={presence.comes(member) || undefined}>
                <Avatar avatarId={member.avatarId} pseudo={member.displayName} size="md" />
              </span>
              <span className={styles.personName}>{presence.nameOf(member)}</span>
              {line ? <span className="visually-hidden">{line}</span> : null}
            </li>
          );
        })}
      </ul>
      {presence.day ? (
        <p className={styles.hint}>{t('groups.page.ringHint', { day: presence.day })}</p>
      ) : null}
    </section>
  );
}

import { UserPlus } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import LinkButton from '@/shared/components/LinkButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
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

export default function GroupMembersPanel({
  group,
  viewerId,
  onInvite,
  onLeave,
}: Readonly<{
  group: FriendGroupDetail;
  viewerId: string | undefined;
  onInvite?: () => void;
  onLeave?: () => void;
}>) {
  const { t } = useTranslation();
  const presence = useMembersPresence(group, viewerId);
  return (
    <div className={styles.panel}>
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
      <div className={styles.footer}>
        {onInvite ? (
          <Button variant="secondary" onClick={onInvite}>
            <UserPlus size={ICON_SIZE.md} aria-hidden />
            {t('groups.page.invite')}
          </Button>
        ) : null}
        <p className={styles.hint}>{t('groups.page.membersHint')}</p>
        {onLeave ? (
          <LinkButton size="sm" className={styles.leave} onClick={onLeave}>
            {t('groups.page.leave')}
          </LinkButton>
        ) : null}
      </div>
    </div>
  );
}

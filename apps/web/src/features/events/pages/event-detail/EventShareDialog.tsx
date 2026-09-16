import { Film, Users } from 'lucide-react';
import ShareDialog from '@/shared/components/ShareDialog';
import EventInviteFriendsTab from '@/features/events/components/EventInviteFriendsTab';
import { useTranslation } from '@/shared/i18n';
import type { EventData } from '@/features/events/types';
import { ICON_SIZE } from '@/shared/components/iconSize';

export type EventShareTab = 'link' | 'friends';

export default function EventShareDialog({
  open,
  onClose,
  slug,
  event,
  shareUrl,
  dateFormatted,
  timeFormatted,
  dateLabel,
  participantsLabel,
  initialTab,
  hostCanInvite,
  friendsBadge,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  slug: string;
  event: EventData;
  shareUrl: string;
  dateFormatted: string;
  timeFormatted: string;
  dateLabel: string;
  participantsLabel: string;
  initialTab: EventShareTab | undefined;
  hostCanInvite: boolean;
  friendsBadge: number | undefined;
}>) {
  const { t } = useTranslation();
  const friendsTab = hostCanInvite
    ? {
        id: 'friends',
        label: t('share.tabFriends'),
        icon: <Users size={ICON_SIZE.md} aria-hidden />,
        badge: friendsBadge,
        content: <EventInviteFriendsTab slug={slug} onNavigate={onClose} />,
      }
    : undefined;

  return (
    <ShareDialog
      open={open}
      onClose={onClose}
      title={t('events.share.dialogTitle')}
      url={shareUrl}
      qrHint={t('events.share.qrHint')}
      fileSlug={slug}
      preview={{
        icon: <Film size={ICON_SIZE.xl} aria-hidden />,
        name: event.title,
        meta: [dateFormatted, participantsLabel],
      }}
      shareText={t('events.share.shareText', {
        title: event.title,
        time: timeFormatted,
        date: dateLabel,
      })}
      surface="event"
      initialTab={initialTab}
      extraTab={friendsTab}
    />
  );
}

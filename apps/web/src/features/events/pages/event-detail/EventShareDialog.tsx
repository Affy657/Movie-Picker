import { Clapperboard, Film, Users } from 'lucide-react';
import ShareDialog from '@/shared/components/ShareDialog';
import EventInviteFriendsTab from '@/features/events/components/EventInviteFriendsTab';
import { ratingCountLabel } from '@/features/events/components/MovieRatingDialog';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTranslation } from '@/shared/i18n';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import type { RecapShare } from './eventDetailSessionTypes';
import { averageRating, formatRating } from '@/shared/utils/formatRating';
import { ICON_SIZE } from '@/shared/components/iconSize';

export type EventShareTab = 'link' | 'friends';

type Props = {
  open: boolean;
  onClose: () => void;
  slug: string;
  event: EventData;
  shareUrl: string;
  dateFormatted: string;
  timeFormatted: string;
  dateLabel: string;
  participantsLabel: string;
  initialTab?: EventShareTab | undefined;
  hostCanInvite?: boolean;
  friendsBadge?: number | undefined;
  recap?: RecapShare | null;
};

function useRecapRatingsLabel(movie: MovieData | null | undefined): string {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  if (!movie) return '';
  const values = (movie.ratings ?? []).map((rating) => rating.value);
  const average = averageRating(values);
  if (average === null) return t('events.recap.share.noRating');
  const scale = user?.ratingScale ?? 'five';
  return `${t('events.ratings.average', { value: formatRating(average, scale, locale, { decimals: 1 }) })}, ${ratingCountLabel(values.length, t)}`;
}

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
  hostCanInvite = false,
  friendsBadge,
  recap = null,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const ratingsLabel = useRecapRatingsLabel(recap?.movie);
  const friendsTab =
    hostCanInvite && !recap
      ? {
          id: 'friends',
          label: t('share.tabFriends'),
          icon: <Users size={ICON_SIZE.md} aria-hidden />,
          badge: friendsBadge,
          content: <EventInviteFriendsTab slug={slug} onNavigate={onClose} />,
        }
      : undefined;

  if (recap) {
    const movie = recap.movie;
    return (
      <ShareDialog
        open={open}
        onClose={onClose}
        title={t('events.recap.share.dialogTitle')}
        url={shareUrl}
        qrHint={t('events.recap.share.qrHint')}
        fileSlug={`recap-${slug}`}
        preview={{
          icon: <Clapperboard size={ICON_SIZE.xl} aria-hidden />,
          name: event.title,
          meta: movie ? [movie.title, ratingsLabel] : [dateFormatted],
        }}
        shareText={
          movie
            ? t('events.recap.share.shareText', { movie: movie.title, title: event.title })
            : t('events.recap.share.shareTextNoMovie', { title: event.title })
        }
        surface="event"
        initialTab="link"
      />
    );
  }

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

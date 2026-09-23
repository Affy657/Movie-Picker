import { Clapperboard, Film, Image as ImageIcon, Users } from 'lucide-react';
import ShareDialog from '@/shared/components/ShareDialog';
import EventInviteFriendsTab from '@/features/events/components/EventInviteFriendsTab';
import StoryShareTab from '@/features/events/story/StoryShareTab';
import { ratingCountLabel } from '@/features/events/components/RatingNotes';
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
  const recapMovie = recap ? (recap.winners[0] ?? null) : null;
  const ratingsLabel = useRecapRatingsLabel(recapMovie);
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
    const movie = recapMovie;
    const shareText = movie
      ? t('events.recap.share.shareText', { movie: movie.title, title: event.title })
      : t('events.recap.share.shareTextNoMovie', { title: event.title });
    const storyTab =
      recap.winners.length > 0
        ? {
            id: 'story',
            label: t('events.recap.story.tab'),
            icon: <ImageIcon size={ICON_SIZE.md} aria-hidden />,
            content: (
              <StoryShareTab
                event={event}
                winners={recap.winners}
                recapUrl={shareUrl}
                shareText={shareText}
              />
            ),
          }
        : undefined;
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
        shareText={shareText}
        surface="event"
        initialTab="link"
        extraTab={storyTab}
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

import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import ShareDialog, { type ShareView } from '@/shared/components/ShareDialog';
import EventInviteFriends from '@/features/events/components/EventInviteFriends';
import { useStoryShare } from '@/features/events/story/useStoryShare';
import { qrCardFileName, useQrCardImage } from '@/features/events/story/qrCardImage';
import { useTranslation, type Translate } from '@/shared/i18n';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import type { RecapShare, ShareTab } from './eventDetailSessionTypes';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { invitationShareText } from '@/features/events/utils/invitationShareText';

type Props = {
  open: boolean;
  onClose: () => void;
  slug: string;
  event: EventData;
  shareUrl: string;
  dateFormatted: string;
  timeFormatted: string;
  dateLabel: string;
  initialTab?: ShareTab;
  hostCanInvite?: boolean;
  recap?: RecapShare | null;
};

function recapShareText(t: Translate, event: EventData, movie: MovieData | null): string {
  if (!movie) return t('events.recap.share.shareTextNoMovie', { title: event.title });
  const key = event.isFinished
    ? 'events.recap.share.shareText'
    : 'events.recap.share.shareTextUpcoming';
  return t(key, { movie: movie.title, title: event.title });
}

function upperFirst(value: string, locale: string): string {
  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
}

type RecapProps = Pick<Props, 'open' | 'onClose' | 'event' | 'shareUrl' | 'dateFormatted'> & {
  recap: RecapShare;
};

type NightProps = Omit<Props, 'recap'>;

function RecapShareDialog({
  open,
  onClose,
  event,
  shareUrl,
  dateFormatted,
  recap,
}: Readonly<RecapProps>) {
  const { t, locale } = useTranslation();
  const [view, setView] = useState<ShareView>('main');
  const detail = upperFirst(dateFormatted, locale);
  const qrImage = useQrCardImage(open ? { title: event.title, detail, url: shareUrl } : null);
  const story = useStoryShare({
    event,
    winners: recap.winners,
    recapUrl: shareUrl,
    active: open && view === 'extra',
  });

  return (
    <ShareDialog
      open={open}
      onClose={onClose}
      title={t('events.recap.share.dialogTitle')}
      url={shareUrl}
      qrTitle={t('events.recap.share.qrTitle')}
      card={{ name: event.title, detail }}
      qrImage={qrImage}
      imageFileName={qrCardFileName(`recap-${event.recapSlug ?? ''}`)}
      shareText={recapShareText(t, event, recap.winners[0] ?? null)}
      analyticsSurface="event"
      onViewChange={setView}
      extraView={
        recap.winners.length > 0
          ? {
              triggerLabel: t('events.recap.story.tab'),
              triggerIcon: <ImageIcon size={ICON_SIZE.md} aria-hidden />,
              title: t('events.recap.story.tab'),
              body: story.body,
              footer: story.actions,
            }
          : undefined
      }
    />
  );
}

function NightShareDialog({
  open,
  onClose,
  slug,
  event,
  shareUrl,
  dateFormatted,
  timeFormatted,
  dateLabel,
  initialTab,
  hostCanInvite = false,
}: Readonly<NightProps>) {
  const { t, locale } = useTranslation();
  const detail = upperFirst(dateFormatted, locale);
  const qrImage = useQrCardImage(open ? { title: event.title, detail, url: shareUrl } : null);

  return (
    <ShareDialog
      open={open}
      onClose={onClose}
      title={t('events.share.dialogTitle')}
      url={shareUrl}
      qrTitle={t('events.share.qrTitle')}
      card={{ name: event.title, detail }}
      qrImage={qrImage}
      imageFileName={qrCardFileName(slug)}
      shareText={invitationShareText(t, locale, event, dateLabel, timeFormatted)}
      analyticsSurface="event"
      fixedHeight={hostCanInvite}
    >
      {hostCanInvite ? (
        <EventInviteFriends
          slug={slug}
          focusSearch={initialTab === 'friends'}
          onNavigate={onClose}
        />
      ) : null}
    </ShareDialog>
  );
}

export default function EventShareDialog({ recap = null, ...night }: Readonly<Props>) {
  if (!recap) return <NightShareDialog {...night} />;
  return (
    <RecapShareDialog
      open={night.open}
      onClose={night.onClose}
      event={night.event}
      shareUrl={night.shareUrl}
      dateFormatted={night.dateFormatted}
      recap={recap}
    />
  );
}

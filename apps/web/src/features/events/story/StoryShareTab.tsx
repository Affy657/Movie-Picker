import { useMemo, useRef, useState } from 'react';
import { CircleAlert, Download, Film, RotateCcw, Share2, Star } from 'lucide-react';
import Button from '@/shared/components/Button';
import EmptyState from '@/shared/components/EmptyState';
import QrCode from '@/shared/components/QrCode';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useTranslation } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';
import { downloadBlob } from '@/shared/utils/downloadBlob';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import StoryCarousel from './StoryCarousel';
import { canShareStoryFile, shareStoryImage } from './shareStoryImage';
import {
  storyFamilies,
  storyFileName,
  storySlides,
  type StoryFamilyKey,
  type StorySlide,
} from './storySlides';
import { storyImageSpec } from './storySpec';
import { useStoryImage } from './useStoryImage';
import styles from './Story.module.css';

const FAMILY_ICONS = {
  films: Film,
  film: Film,
  ratings: Star,
} as const;

type Props = {
  event: EventData;
  winners: readonly MovieData[];
  recapUrl: string;
  shareText: string;
};

export default function StoryShareTab({ event, winners, recapUrl, shareText }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const qrRef = useRef<HTMLDivElement>(null);
  const families = useMemo(() => storyFamilies(winners), [winners]);
  const [family, setFamily] = useState<StoryFamilyKey>(() => families[0]?.key ?? 'film');
  const [index, setIndex] = useState(0);

  const slides = useMemo(() => storySlides(family, winners), [family, winners]);
  const scale = user?.ratingScale ?? 'five';
  const slide = slides[Math.min(index, slides.length - 1)] ?? slides[0];

  const spec = useMemo(
    () => (slide ? storyImageSpec({ event, winners, slide, scale, locale, t, recapUrl }) : null),
    [event, winners, slide, scale, locale, t, recapUrl]
  );

  const image = useStoryImage(`${slide?.key ?? 'none'}-${locale}-${scale}`, spec, qrRef);
  const fileName = slide ? storyFileName(event.slug, slide) : '';
  const canShareFile = useMemo(
    () => image.blob !== null && canShareStoryFile(image.blob, fileName),
    [image.blob, fileName]
  );

  const pickFamily = (next: StoryFamilyKey) => {
    setFamily(next);
    setIndex(0);
  };

  const download = () => {
    if (!image.blob) return;
    downloadBlob(image.blob, fileName);
    track('link_shared', { method: 'story_download', surface: 'event' });
  };

  const share = async () => {
    if (!image.blob) return;
    const outcome = await shareStoryImage({
      blob: image.blob,
      fileName,
      title: event.title,
      text: shareText,
      url: recapUrl,
    });
    if (outcome !== 'cancelled') track('link_shared', { method: 'story', surface: 'event' });
  };

  const renderSlide = (item: StorySlide, current: boolean) => {
    if (!current) {
      const poster = posterImageSrc(item.movie?.posterPath);
      return (
        <span className={styles.placeholder}>
          {poster ? (
            <img className={styles.placeholderPoster} src={poster} alt="" draggable={false} />
          ) : null}
          <span className={styles.placeholderLabel}>{item.movie?.title}</span>
        </span>
      );
    }
    if (image.status === 'ready' && image.url) {
      return (
        <img
          className={styles.preview}
          src={image.url}
          alt={t('events.recap.story.preview', { title: event.title })}
          draggable={false}
        />
      );
    }
    return (
      <span className={styles.placeholder} role="status">
        {t('events.recap.story.preparing')}
      </span>
    );
  };

  const slideLabel = (item: StorySlide) =>
    item.movie ? `${item.movie.title} (${item.movie.year})` : t('events.recap.story.familyFilms');

  return (
    <div className={styles.panel}>
      <SegmentedRadioGroup
        className={styles.families}
        size="sm"
        ariaLabel={t('events.recap.story.familyAria')}
        value={family}
        onChange={pickFamily}
        options={families.map((item) => {
          const Icon = FAMILY_ICONS[item.key];
          return {
            value: item.key,
            label: t(item.labelKey as Parameters<typeof t>[0]),
            icon: <Icon size={ICON_SIZE.sm} aria-hidden />,
          };
        })}
      />

      {image.status === 'error' ? (
        <EmptyState
          className={styles.error}
          compact
          icon={<CircleAlert size={ICON_SIZE.lg} aria-hidden />}
          title={t('events.recap.story.errorTitle')}
          message={t('events.recap.story.errorText')}
          actions={
            <Button type="button" variant="primary" onClick={image.retry}>
              <RotateCcw size={ICON_SIZE.md} aria-hidden />
              {t('common.retry')}
            </Button>
          }
        />
      ) : (
        <>
          <StoryCarousel
            slides={slides}
            index={slide?.index ?? 0}
            onIndexChange={setIndex}
            label={t('events.recap.story.carouselAria')}
            roleDescription={t('events.recap.story.carouselRole')}
            slideLabel={(item) => (
              <>
                {slideLabel(item)}
                {slides.length > 1 ? (
                  <span className={styles.position}>
                    {t('events.recap.story.position', {
                      index: item.index + 1,
                      total: slides.length,
                    })}
                  </span>
                ) : null}
              </>
            )}
            renderSlide={renderSlide}
            previousLabel={t('events.recap.story.previous')}
            nextLabel={t('events.recap.story.next')}
          />
          <p className={styles.hint}>
            {t('events.recap.story.hint')}
            {slides.length > 1 ? ` ${t('events.recap.story.hintSwipe')}` : ''}
          </p>
          <div className={styles.actions}>
            {canShareFile ? (
              <Button type="button" variant="primary" onClick={() => void share()}>
                <Share2 size={ICON_SIZE.md} aria-hidden />
                {t('events.recap.story.share')}
              </Button>
            ) : null}
            <Button
              type="button"
              variant={canShareFile ? 'secondary' : 'primary'}
              disabled={image.status !== 'ready'}
              onClick={download}
            >
              <Download size={ICON_SIZE.md} aria-hidden />
              {t('events.recap.story.download')}
            </Button>
          </div>
        </>
      )}

      <div className="visually-hidden" ref={qrRef} aria-hidden>
        <QrCode value={recapUrl} title={t('events.recap.story.qrCaption')} />
      </div>
    </div>
  );
}

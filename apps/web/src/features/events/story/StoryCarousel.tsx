import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { StorySlide } from './storySlides';
import styles from './Story.module.css';

const SWIPE_THRESHOLD = 40;

type Props = {
  slides: readonly StorySlide[];
  index: number;
  onIndexChange: (index: number) => void;
  label: string;
  roleDescription: string;
  slideLabel: (slide: StorySlide) => ReactNode;
  renderSlide: (slide: StorySlide, current: boolean) => ReactNode;
  previousLabel: string;
  nextLabel: string;
};

export default function StoryCarousel({
  slides,
  index,
  onIndexChange,
  label,
  roleDescription,
  slideLabel,
  renderSlide,
  previousLabel,
  nextLabel,
}: Readonly<Props>) {
  const startX = useRef<number | null>(null);
  const current = slides[index];
  const alone = slides.length <= 1;

  const go = (next: number) => {
    if (next < 0 || next >= slides.length || next === index) return;
    onIndexChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') go(index + 1);
    else if (event.key === 'ArrowLeft') go(index - 1);
    else return;
    event.preventDefault();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startX.current = event.clientX;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const from = startX.current;
    startX.current = null;
    if (from === null) return;
    const moved = event.clientX - from;
    if (Math.abs(moved) < SWIPE_THRESHOLD) return;
    go(moved < 0 ? index + 1 : index - 1);
  };

  if (!current) return null;

  return (
    <div className={styles.carousel}>
      <div
        className={styles.viewport}
        role="group"
        aria-roledescription={roleDescription}
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startX.current = null;
        }}
      >
        <div className={styles.track}>
          {alone || index > 0 ? null : <div className={styles.spacer} />}
          {slides.map((slide) =>
            Math.abs(slide.index - index) > 1 ? null : (
              <div
                key={slide.key}
                className={clsx(styles.slide, slide.index !== index && styles.slideSide)}
                aria-hidden={slide.index === index ? undefined : true}
              >
                {renderSlide(slide, slide.index === index)}
              </div>
            )
          )}
          {alone || index < slides.length - 1 ? null : <div className={styles.spacer} />}
        </div>
      </div>
      {alone ? null : (
        <>
          <IconButton
            className={clsx(styles.arrow, styles.arrowLeft)}
            ariaLabel={previousLabel}
            onClick={() => go(index - 1)}
            disabled={index === 0}
          >
            <ChevronLeft size={ICON_SIZE.md} aria-hidden />
          </IconButton>
          <IconButton
            className={clsx(styles.arrow, styles.arrowRight)}
            ariaLabel={nextLabel}
            onClick={() => go(index + 1)}
            disabled={index === slides.length - 1}
          >
            <ChevronRight size={ICON_SIZE.md} aria-hidden />
          </IconButton>
          <div className={styles.dots} aria-hidden>
            {slides.map((slide) => (
              <span
                key={slide.key}
                className={clsx(styles.dot, slide.index === index && styles.dotOn)}
              />
            ))}
          </div>
        </>
      )}
      <p className={styles.caption} aria-live="polite">
        {slideLabel(current)}
      </p>
    </div>
  );
}

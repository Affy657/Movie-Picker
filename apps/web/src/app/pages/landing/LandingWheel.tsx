import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import Button from '@/shared/components/Button';
import SpinningWheel from '@/features/events/components/SpinningWheel';
import type { MovieData } from '@/shared/types/movie';
import { WHEEL_SPIN_DURATION_MS } from '@/shared/utils/wheelSpin';
import { randomIndex } from '@/shared/utils/random';
import { useTranslation } from '@/shared/i18n';
import { DEMO_WHEEL_MOVIES } from './demoContent';
import { LANDING_ANCHORS } from './anchors';
import shared from './landingShared.module.css';
import styles from './LandingWheel.module.css';

const SPIN_SAFETY_MS = WHEEL_SPIN_DURATION_MS + 600;
const MOUNT_FALLBACK_MS = 1500;

const WHEEL_MOVIES: MovieData[] = DEMO_WHEEL_MOVIES.map((title, index) => ({
  id: `landing-${index}`,
  eventId: 'landing',
  participantId: 'landing',
  tmdbId: index,
  title,
  year: '',
  posterPath: null,
  proposerPseudo: '',
  score: 0,
  up: 0,
  down: 0,
}));

function pickWinnerIndex(): number {
  return randomIndex(WHEEL_MOVIES.length);
}

export default function LandingWheel() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [run, setRun] = useState(() => ({ id: 0, winnerIndex: pickWinnerIndex() }));
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (!('IntersectionObserver' in window)) {
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setStarted(true);
        observer.disconnect();
      },
      { rootMargin: '0px 0px -20% 0px', threshold: 0.15 }
    );
    observer.observe(section);

    let fallback: ReturnType<typeof setTimeout> | undefined;
    const armFallback = (): void => {
      fallback ??= setTimeout(() => setStarted(true), MOUNT_FALLBACK_MS);
    };
    window.addEventListener('scroll', armFallback, { once: true, passive: true });

    return () => {
      window.removeEventListener('scroll', armFallback);
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    setSpinning(true);
    setWinner(null);
  }, [started, run.id]);

  const finish = useCallback(() => {
    setSpinning(false);
    setWinner(WHEEL_MOVIES[run.winnerIndex]?.title ?? null);
  }, [run.winnerIndex]);

  useEffect(() => {
    if (!spinning) return;
    const safety = setTimeout(finish, SPIN_SAFETY_MS);
    return () => clearTimeout(safety);
  }, [spinning, finish]);

  const spinAgain = (): void => {
    setStarted(true);
    setRun((previous) => ({ id: previous.id + 1, winnerIndex: pickWinnerIndex() }));
  };

  let spinButtonLabel = t('landing.wheel.spin');
  if (spinning) spinButtonLabel = t('landing.wheel.spinning');
  else if (winner) spinButtonLabel = t('landing.wheel.spinAgain');

  return (
    <section
      ref={sectionRef}
      className={clsx('on-dark', shared.ink, shared.section, styles.section)}
      id={LANDING_ANCHORS.wheel}
      aria-labelledby="landing-wheel"
    >
      <div className={clsx(shared.container, styles.grid)}>
        <div className={styles.copy}>
          <p className={shared.eyebrow}>{t('landing.wheel.eyebrow')}</p>
          <h2 className={shared.h2} id="landing-wheel">
            {t('landing.wheel.title')}
          </h2>
          <p className={shared.lead}>{t('landing.wheel.lead')}</p>
          <ul className={styles.tags}>
            <li>
              <Check size={18} className={styles.tagIcon} aria-hidden="true" />
              {t('landing.wheel.tag1')}
            </li>
            <li>
              <Check size={18} className={styles.tagIcon} aria-hidden="true" />
              {t('landing.wheel.tag2')}
            </li>
            <li>
              <Check size={18} className={styles.tagIcon} aria-hidden="true" />
              {t('landing.wheel.tag3')}
            </li>
          </ul>
        </div>

        <div className={styles.stage}>
          <div className={styles.canvasWrap} role="img" aria-label={t('landing.wheel.canvasLabel')}>
            {started ? (
              <SpinningWheel
                key={run.id}
                movies={WHEEL_MOVIES}
                winnerIndex={run.winnerIndex}
                onDone={finish}
              />
            ) : null}
          </div>

          <Button variant="primary" size="lg" onClick={spinAgain} disabled={spinning}>
            {spinButtonLabel}
          </Button>

          <div className={styles.result} aria-live="polite">
            {winner ? (
              <>
                <p className={styles.resultLabel}>{t('landing.wheel.resultLabel')}</p>
                <p className={styles.resultTitle}>{winner}</p>
              </>
            ) : (
              <p className={styles.hint}>
                {spinning ? t('landing.wheel.hintSpinning') : t('landing.wheel.hint')}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

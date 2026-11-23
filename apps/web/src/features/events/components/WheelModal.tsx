import confetti from 'canvas-confetti';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Disc3, Film, X } from 'lucide-react';
import type { MovieData } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import MovieFacts from '@/features/movies/components/MovieFacts';
import { keepPunctuationAttached } from '@/shared/utils/keepPunctuationAttached';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { wheelChanceLabels } from '@/features/events/lib/wheelSliceWeights';
import SpinningWheel, { WHEEL_SEGMENT_TOKENS } from './SpinningWheel';
import { readCssToken } from '@/shared/utils/cssToken';
import PosterBackdrop from '@/shared/components/PosterBackdrop';
import Modal from '@/shared/components/Modal';
import styles from './WheelModal.module.css';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';

const noop = () => {};

function supportsPopover(element: HTMLElement): boolean {
  return typeof element.showPopover === 'function';
}

export function confettiPalettes(colors: string[]) {
  if (colors.length === 0) return { burst: undefined, left: undefined, right: undefined };
  if (colors.length === 1) return { burst: colors, left: colors, right: colors };
  const half = Math.ceil(colors.length / 2);
  return { burst: colors, left: colors.slice(0, half), right: colors.slice(half) };
}

function revealTitle(
  skipSpin: boolean,
  winnerCount: number,
  params: { index: number; total: number },
  t: Translate
): string {
  if (skipSpin) {
    return winnerCount > 1
      ? t('events.wheel.modal.manualWinnerTitleOfMany', params)
      : t('events.wheel.modal.manualWinnerTitle');
  }
  return winnerCount > 1
    ? t('events.wheel.modal.winnerTitleOfMany', params)
    : t('events.wheel.modal.winnerTitle');
}

interface WheelModalProps {
  open: boolean;
  movies: MovieData[];
  weights?: readonly number[];
  showChances?: boolean;
  winnerIndex: number;
  winner: MovieData;
  wheelKey: number;
  spinDurationMs?: number;
  onClose: () => void;
  onRelaunch?: () => void;
  relaunching?: boolean;
  relaunchError?: string | null;
  onSpinComplete?: () => void;
  skipSpin?: boolean;
  winnerCount?: number;
  remainingDraws?: number;
  ratingScale?: RatingScale;
}

export default function WheelModal({
  open,
  movies,
  weights,
  showChances = false,
  winnerIndex,
  winner,
  wheelKey,
  spinDurationMs,
  onClose,
  onRelaunch,
  relaunching = false,
  relaunchError = null,
  onSpinComplete,
  skipSpin = false,
  winnerCount = 1,
  remainingDraws = 0,
  ratingScale,
}: Readonly<WheelModalProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const titleId = useId();
  const spinless = skipSpin || movies.length < 2;
  const drawIndex = Math.max(1, winnerCount - remainingDraws);
  const title = revealTitle(skipSpin, winnerCount, { index: drawIndex, total: winnerCount }, t);
  const remainingLabel =
    remainingDraws > 0
      ? pluralizeCount(
          remainingDraws,
          'events.wheel.modal.remainingOne',
          'events.wheel.modal.remainingMany',
          t
        )
      : null;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const confettiOverlayRef = useRef<HTMLDivElement>(null);
  const [animDone, setAnimDone] = useState(spinless);
  const chanceLabels = useMemo(
    () => (showChances ? wheelChanceLabels(weights ?? movies.map(() => 1), locale) : undefined),
    [showChances, weights, movies, locale]
  );
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const cleanupConfettiOverlay = useCallback(() => {
    clearTimeout(confettiTimerRef.current);
    confettiCanvasRef.current?.remove();
    confettiCanvasRef.current = null;
    const overlay = confettiOverlayRef.current;
    if (overlay && supportsPopover(overlay) && overlay.matches(':popover-open')) {
      overlay.hidePopover();
    }
  }, []);

  useEffect(() => {
    if (open) {
      setAnimDone(spinless);
      cleanupConfettiOverlay();
    }
  }, [open, wheelKey, spinless, cleanupConfettiOverlay]);

  useEffect(() => {
    if (open && animDone) titleRef.current?.focus();
  }, [open, animDone]);

  useEffect(() => {
    return () => cleanupConfettiOverlay();
  }, [cleanupConfettiOverlay]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg || animDone) return;
    const keepSpinning = (e: Event) => e.preventDefault();
    dlg.addEventListener('cancel', keepSpinning);
    return () => dlg.removeEventListener('cancel', keepSpinning);
  }, [animDone]);

  const closeUnlessSpinning = useCallback(() => {
    if (animDone) {
      onClose();
      return;
    }
    const dlg = dialogRef.current;
    if (dlg && !dlg.open) dlg.showModal();
  }, [animDone, onClose]);

  const onSpinCompleteRef = useRef(onSpinComplete);
  onSpinCompleteRef.current = onSpinComplete;

  const handleWheelDone = useCallback(() => {
    setAnimDone(true);
    onSpinCompleteRef.current?.();

    requestAnimationFrame(() => {
      cleanupConfettiOverlay();
      const overlay = confettiOverlayRef.current;
      if (!overlay) return;

      const popoverSupported = supportsPopover(overlay);
      if (popoverSupported) overlay.showPopover();
      const host = popoverSupported ? overlay : (dialogRef.current ?? overlay);

      const canvas = document.createElement('canvas');
      canvas.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      host.appendChild(canvas);
      confettiCanvasRef.current = canvas;

      const fire = confetti.create(canvas, {
        resize: true,
        useWorker: false,
        disableForReducedMotion: true,
      });
      const {
        burst: burstColors,
        left: leftColors,
        right: rightColors,
      } = confettiPalettes(
        WHEEL_SEGMENT_TOKENS.map((token) => readCssToken(token)).filter(Boolean)
      );

      fire?.({
        particleCount: 160,
        spread: 80,
        origin: { x: 0.5, y: 0.55 },
        colors: burstColors,
      })?.catch(noop);

      clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = setTimeout(() => {
        fire?.({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0.1, y: 0.5 },
          colors: leftColors,
        })?.catch(noop);
        fire?.({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 0.9, y: 0.5 },
          colors: rightColors,
        })?.catch(noop);
        confettiTimerRef.current = setTimeout(cleanupConfettiOverlay, 4500);
      }, 180);
    });
  }, [cleanupConfettiOverlay]);

  useEffect(() => {
    if (open && spinless) {
      handleWheelDone();
    }
  }, [open, wheelKey, spinless, handleWheelDone]);

  const posterSrc = posterImageSrc(winner.posterPath);
  const providers = winner.watchProviders ?? [];

  return (
    <>
      <Modal
        open={open}
        onClose={closeUnlessSpinning}
        size="md"
        surface={animDone ? 'media' : 'bare'}
        strongBackdrop
        ariaLabelledBy={titleId}
        dialogRef={dialogRef}
        className={animDone ? styles.dialogDone : undefined}
      >
        <output className="visually-hidden">
          {animDone ? t('events.wheel.modal.winnerAnnouncement', { title: winner.title }) : null}
        </output>
        {!animDone && (
          <div className={styles.spinPhase}>
            <SpinningWheel
              key={wheelKey}
              movies={movies}
              weights={weights}
              chanceLabels={chanceLabels}
              winnerIndex={winnerIndex}
              durationMs={spinDurationMs}
              onDone={handleWheelDone}
            />
            <p className={styles.spinLabel} id={titleId}>
              {t('events.wheel.modal.spinningTitle')}
            </p>
            {chanceLabels ? (
              <>
                <p className={styles.spinHint}>{t('events.wheel.modal.weightedHint')}</p>
                <ul className="visually-hidden">
                  {movies.map((movie, index) => (
                    <li key={movie.id}>
                      {t('events.wheel.modal.chanceItem', {
                        title: movie.title,
                        chance: chanceLabels[index] ?? '',
                      })}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        )}

        {animDone && (
          <div className={styles.reveal}>
            <PosterBackdrop posterPath={winner.posterPath} />
            <div className={styles.header}>
              <h2 id={titleId} ref={titleRef} tabIndex={-1} className={styles.title}>
                {title}
              </h2>
              <IconButton tone="onPoster" ariaLabel={t('common.close')} onClick={onClose}>
                <X aria-hidden size={ICON_SIZE.lg} />
              </IconButton>
            </div>

            <div className={styles.winnerArea}>
              {posterSrc ? (
                <img src={posterSrc} alt={winner.title} className={styles.poster} loading="lazy" />
              ) : (
                <div className={styles.posterPlaceholder} aria-hidden>
                  <Film size={ICON_SIZE['3xl']} />
                </div>
              )}
              <div className={styles.info}>
                <p className={styles.winnerTitle}>{keepPunctuationAttached(winner.title)}</p>
                <MovieFacts movie={winner} scale={ratingScale} className={styles.winnerFacts} />
                {providers.length > 0 && (
                  <div className={styles.providers}>
                    <WatchProviderChips
                      providers={providers}
                      watchPageUrl={winner.tmdbWatchPageUrl}
                      maxVisible={6}
                    />
                  </div>
                )}
              </div>
            </div>

            {remainingLabel ? <p className={styles.remaining}>{remainingLabel}</p> : null}

            {relaunchError ? (
              <p className={`error ${styles.relaunchError}`} role="alert">
                {relaunchError}
              </p>
            ) : null}

            <div className={styles.footer}>
              {onRelaunch ? (
                <>
                  <Button type="button" onClick={onClose}>
                    {t('events.wheel.modal.finishHereButton')}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={onRelaunch}
                    loading={relaunching}
                  >
                    {relaunching ? null : <Disc3 size={ICON_SIZE.md} aria-hidden />}
                    <span className={styles.relaunchLabel}>
                      {t('events.wheel.modalRelaunchButton')}
                    </span>
                  </Button>
                </>
              ) : (
                <Button type="button" variant="primary" onClick={onClose}>
                  {t('events.wheel.modal.closeButton')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
      <div
        ref={confettiOverlayRef}
        className={styles.confettiOverlay}
        popover="manual"
        aria-hidden="true"
      />
    </>
  );
}

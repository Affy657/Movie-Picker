import confetti from 'canvas-confetti';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Disc3, Film, X } from 'lucide-react';
import type { MovieData } from '@/shared/types/movie';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import { useDialogOpen } from '@/shared/hooks/useDialogOpen';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import SpinningWheel, { WHEEL_SEGMENT_TOKENS } from './SpinningWheel';
import { readCssToken } from '@/shared/utils/cssToken';
import Modal from '@/shared/components/Modal';
import styles from './WheelModal.module.css';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';

const noop = () => {};

export function confettiPalettes(colors: string[]) {
  if (colors.length === 0) return { burst: undefined, left: undefined, right: undefined };
  if (colors.length === 1) return { burst: colors, left: colors, right: colors };
  const half = Math.ceil(colors.length / 2);
  return { burst: colors, left: colors.slice(0, half), right: colors.slice(half) };
}

interface WheelModalProps {
  open: boolean;
  movies: MovieData[];
  winnerIndex: number;
  winner: MovieData;
  wheelKey: number;
  onClose: () => void;
  onRelaunch?: () => void;
  onSpinComplete?: () => void;
  skipSpin?: boolean;
  winnerCount?: number;
  remainingDraws?: number;
}

export default function WheelModal({
  open,
  movies,
  winnerIndex,
  winner,
  wheelKey,
  onClose,
  onRelaunch,
  onSpinComplete,
  skipSpin = false,
  winnerCount = 1,
  remainingDraws = 0,
}: Readonly<WheelModalProps>) {
  const { t } = useTranslation();
  const drawIndex = Math.max(1, winnerCount - remainingDraws);
  const titleParams = { index: drawIndex, total: winnerCount };
  let title: string;
  if (skipSpin) {
    title =
      winnerCount > 1
        ? t('events.wheel.modal.manualWinnerTitleOfMany', titleParams)
        : t('events.wheel.modal.manualWinnerTitle');
  } else {
    title =
      winnerCount > 1
        ? t('events.wheel.modal.winnerTitleOfMany', titleParams)
        : t('events.wheel.modal.winnerTitle');
  }
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
  const confettiOverlayRef = useRef<HTMLDivElement>(null);
  const [animDone, setAnimDone] = useState(skipSpin);
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const cleanupConfettiOverlay = useCallback(() => {
    clearTimeout(confettiTimerRef.current);
    confettiCanvasRef.current?.remove();
    confettiCanvasRef.current = null;
    const overlay = confettiOverlayRef.current;
    if (overlay?.matches(':popover-open')) overlay.hidePopover();
  }, []);

  useDialogOpen(dialogRef, open);

  useEffect(() => {
    if (open) {
      setAnimDone(skipSpin);
      cleanupConfettiOverlay();
    }
  }, [open, wheelKey, skipSpin, cleanupConfettiOverlay]);

  useEffect(() => {
    return () => cleanupConfettiOverlay();
  }, [cleanupConfettiOverlay]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const prevent = (e: Event) => {
      if (!animDone) e.preventDefault();
    };
    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === dlg && animDone) onClose();
    };
    dlg.addEventListener('cancel', prevent);
    dlg.addEventListener('click', handleBackdropClick);
    return () => {
      dlg.removeEventListener('cancel', prevent);
      dlg.removeEventListener('click', handleBackdropClick);
    };
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

      overlay.showPopover();

      const canvas = document.createElement('canvas');
      canvas.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      overlay.appendChild(canvas);
      confettiCanvasRef.current = canvas;

      const fire = confetti.create(canvas, { resize: true, useWorker: false });
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
    if (open && skipSpin) {
      handleWheelDone();
    }
  }, [open, wheelKey, skipSpin, handleWheelDone]);

  const posterSrc = posterImageSrc(winner.posterPath);
  const providers = winner.watchProviders ?? [];

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="md"
        surface={animDone ? 'surface' : 'bare'}
        strongBackdrop
        ariaLabelledBy="wheel-modal-title"
        className={animDone ? styles.dialogDone : undefined}
      >
        {!animDone && (
          <div className={styles.spinPhase}>
            <SpinningWheel
              key={wheelKey}
              movies={movies}
              winnerIndex={winnerIndex}
              onDone={handleWheelDone}
            />
            <p className={styles.spinLabel} id="wheel-modal-title">
              {t('events.wheel.modal.spinningTitle')}
            </p>
          </div>
        )}

        {animDone && (
          <>
            <div className={styles.header}>
              <h2 id="wheel-modal-title" className={styles.title}>
                {title}
              </h2>
              <IconButton ariaLabel={t('common.close')} onClick={onClose}>
                <X size={ICON_SIZE.xl} />
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
                <p className={styles.winnerTitle}>{winner.title}</p>
                {winner.year && <p className={styles.winnerYear}>{winner.year}</p>}
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

            <div className={styles.footer}>
              {onRelaunch ? (
                <>
                  <Button type="button" onClick={onClose}>
                    {t('events.wheel.modal.finishHereButton')}
                  </Button>
                  <Button type="button" variant="primary" onClick={onRelaunch}>
                    <Disc3 size={ICON_SIZE.md} aria-hidden />
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
          </>
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

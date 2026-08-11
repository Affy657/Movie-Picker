import confetti from 'canvas-confetti';
import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { MovieData } from '@/shared/types/movie';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import { useDialogOpen } from '@/shared/hooks/useDialogOpen';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { useTranslation } from '@/shared/i18n';
import SpinningWheel from './SpinningWheel';
import styles from './WheelModal.module.css';

const noop = () => {};

interface WheelModalProps {
  open: boolean;
  movies: MovieData[];
  winnerIndex: number;
  winner: MovieData;
  wheelKey: number;
  onClose: () => void;
  onRelaunch?: () => void;
  skipSpin?: boolean;
}

export default function WheelModal({
  open,
  movies,
  winnerIndex,
  winner,
  wheelKey,
  onClose,
  onRelaunch,
  skipSpin = false,
}: Readonly<WheelModalProps>) {
  const { t } = useTranslation();
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
    dlg.addEventListener('cancel', prevent);
    return () => dlg.removeEventListener('cancel', prevent);
  }, [animDone]);

  const handleWheelDone = useCallback(() => {
    setAnimDone(true);

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

      fire?.({
        particleCount: 160,
        spread: 80,
        origin: { x: 0.5, y: 0.55 },
        colors: ['#3B82F6', '#7C3AED', '#06B6D4', '#EC4899', '#F97316', '#10B981'],
      })?.catch(noop);

      clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = setTimeout(() => {
        fire?.({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0.1, y: 0.5 },
          colors: ['#4F46E5', '#D97706', '#0D9488', '#DB2777'],
        })?.catch(noop);
        fire?.({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 0.9, y: 0.5 },
          colors: ['#8B5CF6', '#0891B2', '#F97316', '#EC4899'],
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
      <dialog
        ref={dialogRef}
        className={`${styles.dialog} ${animDone ? styles.dialogDone : styles.dialogSpin}`}
        aria-labelledby="wheel-modal-title"
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
                {skipSpin
                  ? t('events.wheel.modal.manualWinnerTitle')
                  : t('events.wheel.modal.winnerTitle')}
              </h2>
              <button
                type="button"
                className={styles.closeIconBtn}
                onClick={onClose}
                aria-label={t('common.close')}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.winnerArea}>
              {posterSrc ? (
                <img src={posterSrc} alt={winner.title} className={styles.poster} loading="lazy" />
              ) : (
                <div className={styles.posterPlaceholder} aria-hidden />
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

            <div className={styles.footer}>
              {onRelaunch && (
                <button type="button" className="btn" onClick={onRelaunch}>
                  {t('events.wheel.relaunchButton')}
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={onClose}>
                {t('events.wheel.modal.closeButton')}
              </button>
            </div>
          </>
        )}
      </dialog>
      <div
        ref={confettiOverlayRef}
        className={styles.confettiOverlay}
        popover="manual"
        aria-hidden="true"
      />
    </>
  );
}

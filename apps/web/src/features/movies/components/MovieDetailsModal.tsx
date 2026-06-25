import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useDialogOpen } from '@/shared/hooks/useDialogOpen';
import { useTranslation } from '@/shared/i18n';
import type { MovieMediaType } from '@/shared/types/movie';
import { MovieDetailsContent } from '@/features/movies/components/MovieDetailsPanel';
import TrailerModal from '@/features/movies/components/TrailerModal';
import styles from './MovieDetailsModal.module.css';

interface MovieDetailsModalProps {
  open: boolean;
  movieTitle: string;
  tmdbId: number;
  mediaType?: MovieMediaType;
  onClose: () => void;
}

export default function MovieDetailsModal({
  open,
  movieTitle,
  tmdbId,
  mediaType,
  onClose,
}: Readonly<MovieDetailsModalProps>) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const panelId = useId();
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) setTrailerUrl(null);
  }, [open]);

  useDialogOpen(dialogRef, open);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handleClose = () => onCloseRef.current();
    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === dlg) onCloseRef.current();
    };
    dlg.addEventListener('close', handleClose);
    dlg.addEventListener('click', handleBackdropClick);
    return () => {
      dlg.removeEventListener('close', handleClose);
      dlg.removeEventListener('click', handleBackdropClick);
    };
  }, []);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      {open && (
        <>
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {movieTitle}
            </h2>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X aria-hidden size={18} />
            </button>
          </div>
          <div className={styles.body}>
            <MovieDetailsContent
              tmdbId={tmdbId}
              mediaType={mediaType}
              open={open}
              panelId={panelId}
              className={styles.details}
              onPlayTrailer={(url) => setTrailerUrl(url)}
            />
          </div>
          <TrailerModal
            open={trailerUrl != null}
            movieTitle={movieTitle}
            trailerUrl={trailerUrl}
            onClose={() => setTrailerUrl(null)}
          />
        </>
      )}
    </dialog>
  );
}

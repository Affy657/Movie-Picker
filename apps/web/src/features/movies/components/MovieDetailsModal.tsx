import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import { useTranslation } from '@/shared/i18n';
import type { MovieMediaType } from '@/shared/types/movie';
import { MovieDetailsContent } from '@/features/movies/components/MovieDetailsPanel';
import TrailerModal from '@/features/movies/components/TrailerModal';
import dragStyles from '@/shared/components/sheetDrag.module.css';
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
  const dialogRef = useModalDialog(open, onClose);
  const dragBind = useSheetDrag(dialogRef, onClose, open);
  const titleId = useId();
  const panelId = useId();
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setTrailerUrl(null);
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={clsx(styles.dialog, dragStyles.surface)}
      aria-labelledby={titleId}
    >
      {open && (
        <>
          <div className={dragStyles.grab} {...dragBind}>
            <span
              className={clsx(dragStyles.handle, dragStyles.handleMobileOnly)}
              aria-hidden="true"
            />
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

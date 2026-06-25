import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogOpen } from '@/shared/hooks/useDialogOpen';
import { useTranslation } from '@/shared/i18n';
import { extractYouTubeId } from '@/shared/utils/youtube';
import styles from './TrailerModal.module.css';

interface TrailerModalProps {
  open: boolean;
  movieTitle: string;
  trailerUrl: string | null | undefined;
  onClose: () => void;
}

export default function TrailerModal({
  open,
  movieTitle,
  trailerUrl,
  onClose,
}: Readonly<TrailerModalProps>) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const trailerYtId = extractYouTubeId(trailerUrl);
  const embedUrl = trailerYtId
    ? `https://www.youtube.com/embed/${encodeURIComponent(trailerYtId)}`
    : null;
  const visible = open && !!embedUrl;

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useDialogOpen(dialogRef, visible);

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
      {visible && (
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
          <div className={styles.videoWrap}>
            <iframe
              className={styles.video}
              src={`${embedUrl}?autoplay=1&rel=0`}
              title={t('movies.details.trailerLink')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            />
          </div>
        </>
      )}
    </dialog>
  );
}

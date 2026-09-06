import { useId } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { extractYouTubeId } from '@/shared/utils/youtube';
import styles from './TrailerModal.module.css';
import Modal from '@/shared/components/Modal';

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
  const titleId = useId();
  const trailerYtId = extractYouTubeId(trailerUrl);
  const embedUrl = trailerYtId
    ? `https://www.youtube.com/embed/${encodeURIComponent(trailerYtId)}`
    : null;
  const visible = open && !!embedUrl;
  return (
    <Modal open={visible} onClose={onClose} size="xxl" surface="media" labelledBy={titleId}>
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
    </Modal>
  );
}

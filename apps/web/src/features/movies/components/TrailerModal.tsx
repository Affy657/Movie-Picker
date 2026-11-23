import { useTranslation } from '@/shared/i18n';
import { extractYouTubeId } from '@/shared/utils/youtube';
import styles from './TrailerModal.module.css';
import Button from '@/shared/components/Button';
import Modal, { ModalActions, ModalFooter } from '@/shared/components/Modal';

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
  const trailerYtId = extractYouTubeId(trailerUrl);
  if (!trailerYtId) return null;
  const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(trailerYtId)}`;
  return (
    <Modal open={open} onClose={onClose} size="2xl" surface="media" title={movieTitle}>
      {open && (
        <>
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
          <ModalFooter>
            <ModalActions>
              <Button size="sm" onClick={onClose}>
                {t('movies.details.trailerClose')}
              </Button>
            </ModalActions>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialogOpen } from '@/shared/hooks/useDialogOpen';
import { useTranslation } from '@/shared/i18n';
import type { WatchProviderOffer } from '@/shared/types/movie';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import styles from './WatchProvidersModal.module.css';

interface WatchProvidersModalProps {
  open: boolean;
  movieTitle: string;
  providers: WatchProviderOffer[];
  watchPageUrl?: string | null;
  onClose: () => void;
}

export default function WatchProvidersModal({
  open,
  movieTitle,
  providers,
  watchPageUrl,
  onClose,
}: Readonly<WatchProvidersModalProps>) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
      <div className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t('movies.watchProviders.modalTitle')}
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
      <p className={styles.subtitle}>{movieTitle}</p>
      <div className={styles.body}>
        {providers.length > 0 ? (
          <WatchProviderChips providers={providers} watchPageUrl={watchPageUrl} separators />
        ) : (
          <p className={styles.empty}>{t('movies.watchProviders.emptyLabel')}</p>
        )}
      </div>
    </dialog>
  );
}

import { useId } from 'react';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useTranslation } from '@/shared/i18n';
import type { WatchProviderOffer } from '@/shared/types/movie';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import DialogTitleBar from '@/shared/components/DialogTitleBar';
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
  const dialogRef = useModalDialog(open, onClose);
  const titleId = useId();

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <DialogTitleBar
        titleId={titleId}
        title={t('movies.watchProviders.modalTitle')}
        onClose={onClose}
        closeLabel={t('common.close')}
      />
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

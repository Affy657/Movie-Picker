import { useCallback, useId, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import Sheet from '@/shared/components/Sheet';
import AddMovieForm, { type AddMovieFormProps } from '@/features/movies/components/AddMovieForm';
import styles from './AddMoviePanel.module.css';

type AddMoviePanelProps = AddMovieFormProps & {
  triggerLabel: string;
  panelTitle: string;
};

export default function AddMoviePanel({
  triggerLabel,
  panelTitle,
  ...formProps
}: Readonly<AddMoviePanelProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  return (
    <div className={styles.root}>
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          className="btn btn-primary"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} aria-hidden />
          <span>{triggerLabel}</span>
        </button>
      )}

      {open && isMobile && (
        <Sheet open title={panelTitle} onClose={close}>
          <AddMovieForm {...formProps} />
        </Sheet>
      )}

      {open && !isMobile && (
        <div id={panelId} className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{panelTitle}</h3>
            <button
              type="button"
              className={`icon-btn-outline ${styles.closeBtn}`}
              onClick={close}
              aria-label={t('common.close')}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <AddMovieForm {...formProps} />
        </div>
      )}
    </div>
  );
}

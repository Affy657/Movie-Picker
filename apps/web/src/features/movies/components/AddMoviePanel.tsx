import { useCallback, useId, useRef, useState, type RefObject } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import Sheet from '@/shared/components/Sheet';
import AddMovieForm, { type AddMovieFormProps } from '@/features/movies/components/AddMovieForm';
import styles from './AddMoviePanel.module.css';

type AddMoviePanelProps = AddMovieFormProps & {
  triggerLabel: string;
  panelTitle: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  /** Element to refocus on close when hideTrigger is set (there's no internal trigger to fall back to). */
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
};

export default function AddMoviePanel({
  triggerLabel,
  panelTitle,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  returnFocusRef,
  ...formProps
}: Readonly<AddMoviePanelProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => (returnFocusRef?.current ?? triggerRef.current)?.focus());
  }, [setOpen, returnFocusRef]);

  useClickOutside(rootRef, close, open && !isMobile);

  return (
    <div ref={rootRef} className={styles.root}>
      {!open && !hideTrigger && (
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

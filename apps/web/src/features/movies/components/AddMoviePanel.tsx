import { useCallback, useId, useRef, useState, type RefObject } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import Sheet from '@/shared/components/Sheet';
import AddMovieForm, { type AddMovieFormProps } from '@/features/movies/components/AddMovieForm';
import styles from './AddMoviePanel.module.css';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';

type AddMoviePanelProps = AddMovieFormProps & {
  triggerLabel: string;
  panelTitle: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
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
        <Button ref={triggerRef} type="button" variant="primary" onClick={() => setOpen(true)}>
          <Plus size={ICON_SIZE.md} aria-hidden />
          <span>{triggerLabel}</span>
        </Button>
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
            <IconButton label={t('common.close')} onClick={close}>
              <X size={ICON_SIZE.md} aria-hidden />
            </IconButton>
          </div>
          <AddMovieForm {...formProps} />
        </div>
      )}
    </div>
  );
}

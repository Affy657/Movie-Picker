import { useId } from 'react';
import { X } from 'lucide-react';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { useTranslation } from '@/shared/i18n';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Sheet({ open, title, onClose, children, footer }: Readonly<SheetProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useModalDialog(open, onClose);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      {open && (
        <>
          <span className={styles.handle} aria-hidden="true" />
          <div className={styles.head}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button
              type="button"
              className={`icon-btn-outline ${styles.closeBtn}`}
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X aria-hidden size={16} />
            </button>
          </div>
          <div className={styles.body}>{children}</div>
          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </>
      )}
    </dialog>
  );
}

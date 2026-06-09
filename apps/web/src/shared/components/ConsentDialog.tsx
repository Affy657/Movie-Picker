import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useConsent } from '@/shared/contexts/ConsentContext';
import styles from './ConsentDialog.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ConsentDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { analytics, acceptAll, rejectAll, savePreferences } = useConsent();
  const [analyticsChecked, setAnalyticsChecked] = useState(analytics);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reactId = useId();
  const titleId = `consent-dialog-title-${reactId}`;

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      setAnalyticsChecked(analytics);
      dlg.showModal();
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open, analytics]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const handleClose = () => {
      if (open) onCloseRef.current();
    };
    dlg.addEventListener('close', handleClose);
    return () => dlg.removeEventListener('close', handleClose);
  }, [open]);

  function handleSave() {
    savePreferences({ analytics: analyticsChecked });
    onClose();
  }

  function handleAcceptAll() {
    acceptAll();
    onClose();
  }

  function handleRejectAll() {
    rejectAll();
    onClose();
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.title}>
        {t('consent.dialog.title')}
      </h2>
      <p className={styles.description}>{t('consent.dialog.description')}</p>

      <ul className={styles.categories} role="list">
        <li className={styles.category}>
          <div className={styles.categoryInfo}>
            <strong className={styles.categoryName}>{t('consent.dialog.functional')}</strong>
            <p className={styles.categoryDesc}>{t('consent.dialog.functionalDesc')}</p>
          </div>
          <span className={styles.requiredBadge}>{t('consent.dialog.required')}</span>
        </li>
        <li className={styles.category}>
          <label className={styles.categoryLabel} htmlFor="consent-analytics">
            <div className={styles.categoryInfo}>
              <strong className={styles.categoryName}>{t('consent.dialog.analytics')}</strong>
              <p className={styles.categoryDesc}>{t('consent.dialog.analyticsDesc')}</p>
            </div>
            <input
              id="consent-analytics"
              type="checkbox"
              checked={analyticsChecked}
              onChange={(e) => setAnalyticsChecked(e.target.checked)}
              className={styles.checkbox}
            />
          </label>
        </li>
      </ul>

      <div className={styles.actions}>
        <button
          type="button"
          className={`btn btn-sm ${styles.rejectBtn}`}
          onClick={handleRejectAll}
        >
          {t('consent.dialog.rejectAll')}
        </button>
        <button type="button" className="btn btn-sm" onClick={handleSave}>
          {t('consent.dialog.save')}
        </button>
        <button type="button" className="btn btn-sm btn-primary" onClick={handleAcceptAll}>
          {t('consent.dialog.acceptAll')}
        </button>
      </div>
    </dialog>
  );
}

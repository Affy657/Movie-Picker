import { useEffect, useId, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useConsent } from '@/shared/contexts/ConsentContext';
import styles from './ConsentDialog.module.css';
import Modal from './Modal';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ConsentDialog({ open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { analytics, acceptAll, rejectAll, savePreferences } = useConsent();
  const [analyticsChecked, setAnalyticsChecked] = useState(analytics);
  const reactId = useId();
  const titleId = `consent-dialog-title-${reactId}`;

  useEffect(() => {
    if (open) setAnalyticsChecked(analytics);
  }, [open, analytics]);

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
    <Modal open={open} onClose={onClose} size="md" padded labelledBy={titleId}>
      <h2 id={titleId} className={styles.title}>
        {t('consent.dialog.title')}
      </h2>
      <p className={styles.description}>{t('consent.dialog.description')}</p>

      <ul className={styles.categories}>
        <li className={styles.category}>
          <div className={styles.categoryInfo}>
            <strong className={styles.categoryName}>{t('consent.dialog.functional')}</strong>
            <p className={styles.categoryDesc}>{t('consent.dialog.functionalDesc')}</p>
          </div>
          <span className={styles.requiredBadge}>{t('consent.dialog.required')}</span>
        </li>
        <li className={styles.category}>
          <label
            className={styles.categoryLabel}
            htmlFor="consent-analytics"
            aria-label={t('consent.dialog.analytics')}
          >
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
        <li className={styles.category}>
          <div className={styles.categoryInfo}>
            <strong className={styles.categoryName}>{t('consent.dialog.errorMonitoring')}</strong>
            <p className={styles.categoryDesc}>{t('consent.dialog.errorMonitoringDesc')}</p>
          </div>
          <span className={styles.requiredBadge}>{t('consent.dialog.required')}</span>
        </li>
      </ul>

      <div className={styles.actions}>
        <button
          type="button"
          className={`btn btn-sm ${styles.actionBtn} ${styles.rejectBtn}`}
          onClick={handleRejectAll}
        >
          {t('consent.dialog.rejectAll')}
        </button>
        <button type="button" className={`btn btn-sm ${styles.actionBtn}`} onClick={handleSave}>
          {t('consent.dialog.save')}
        </button>
        <button
          type="button"
          className={`btn btn-sm btn-primary ${styles.actionBtn}`}
          onClick={handleAcceptAll}
        >
          {t('consent.dialog.acceptAll')}
        </button>
      </div>
    </Modal>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import {
  fetchNotificationPreferences,
  patchNotificationPreferences,
  type NotificationPreferences,
} from '@/features/notifications/api/notificationsApi';
import { useTranslation } from '@/shared/i18n';
import styles from './NotificationsSection.module.css';

export default function NotificationsSection() {
  const { t } = useTranslation();
  const {
    supported,
    permission,
    subscribed,
    loading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [savingPref, setSavingPref] = useState<string | null>(null);

  useEffect(() => {
    if (!subscribed) return;
    fetchNotificationPreferences()
      .then(setPrefs)
      .catch(() => {});
  }, [subscribed]);

  const handleTogglePref = useCallback(
    async (key: keyof NotificationPreferences) => {
      if (!prefs) return;
      setSavingPref(key);
      try {
        const updated = await patchNotificationPreferences({ [key]: !prefs[key] });
        setPrefs(updated);
      } finally {
        setSavingPref(null);
      }
    },
    [prefs]
  );

  if (!supported) {
    return (
      <section className="section section--panel" aria-labelledby="notifications-heading">
        <h2 id="notifications-heading" className={styles.sectionTitle}>
          <Bell size={18} aria-hidden />
          {t('notifications.title')}
        </h2>
        <p className="hint">{t('notifications.unsupported')}</p>
      </section>
    );
  }

  return (
    <section className="section section--panel" aria-labelledby="notifications-heading">
      <h2 id="notifications-heading" className={styles.sectionTitle}>
        <Bell size={18} aria-hidden />
        {t('notifications.title')}
      </h2>

      {pushError && (
        <p className="error" role="alert">
          {pushError}
        </p>
      )}

      {permission === 'denied' && <p className="hint">{t('notifications.permissionDenied')}</p>}

      <div className="form">
        <div className={styles.toggleRow}>
          {subscribed ? <BellOff size={16} aria-hidden /> : <Bell size={16} aria-hidden />}
          <div className={styles.toggleInfo}>
            <p className={styles.toggleLabel}>
              {subscribed ? t('notifications.enabledLabel') : t('notifications.disabledLabel')}
            </p>
            <p className={styles.toggleHint}>
              {subscribed ? t('notifications.enabledHint') : t('notifications.disabledHint')}
            </p>
          </div>
          <button
            type="button"
            className={subscribed ? 'btn btn-danger' : 'btn btn-primary'}
            disabled={pushLoading || permission === 'denied'}
            onClick={() => void (subscribed ? unsubscribe() : subscribe())}
          >
            {pushLoading
              ? t('common.loading')
              : subscribed
                ? t('notifications.disableButton')
                : t('notifications.enableButton')}
          </button>
        </div>

        {subscribed && prefs && (
          <>
            <hr className={styles.prefsDivider} />
            <p className={styles.prefsTitle}>{t('notifications.prefsTitle')}</p>

            <label className={styles.prefRow}>
              <input
                type="checkbox"
                checked={prefs.notifyOnParticipantJoined}
                disabled={savingPref === 'notifyOnParticipantJoined'}
                onChange={() => void handleTogglePref('notifyOnParticipantJoined')}
              />
              {t('notifications.prefParticipantJoined')}
            </label>

            <label className={styles.prefRow}>
              <input
                type="checkbox"
                checked={prefs.notifyEventReminder}
                disabled={savingPref === 'notifyEventReminder'}
                onChange={() => void handleTogglePref('notifyEventReminder')}
              />
              {t('notifications.prefEventReminder')}
            </label>
          </>
        )}
      </div>
    </section>
  );
}

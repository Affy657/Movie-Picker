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
        <div className={styles.row}>
          <div className={styles.rowInfo}>
            {subscribed ? (
              <BellOff size={18} aria-hidden className={styles.rowIcon} />
            ) : (
              <Bell size={18} aria-hidden className={styles.rowIcon} />
            )}
            <div className={styles.rowText}>
              <p className={styles.rowLabel}>
                {subscribed ? t('notifications.enabledLabel') : t('notifications.disabledLabel')}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={subscribed}
            className={styles.toggle}
            disabled={pushLoading || permission === 'denied'}
            onClick={() => void (subscribed ? unsubscribe() : subscribe())}
            aria-label={
              subscribed ? t('notifications.disableButton') : t('notifications.enableButton')
            }
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>

        {subscribed && prefs && (
          <>
            <hr className={styles.prefsDivider} />
            <p className={styles.prefsTitle}>{t('notifications.prefsTitle')}</p>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefParticipantJoined')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.notifyOnParticipantJoined}
                className={styles.toggle}
                disabled={savingPref === 'notifyOnParticipantJoined'}
                onClick={() => void handleTogglePref('notifyOnParticipantJoined')}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefEventReminder')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.notifyEventReminder}
                className={styles.toggle}
                disabled={savingPref === 'notifyEventReminder'}
                onClick={() => void handleTogglePref('notifyEventReminder')}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefMovieAdded')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.notifyOnMovieAdded}
                className={styles.toggle}
                disabled={savingPref === 'notifyOnMovieAdded'}
                onClick={() => void handleTogglePref('notifyOnMovieAdded')}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefMoviePicked')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.notifyOnMoviePicked}
                className={styles.toggle}
                disabled={savingPref === 'notifyOnMoviePicked'}
                onClick={() => void handleTogglePref('notifyOnMoviePicked')}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefEventDeleted')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.notifyOnEventDeleted}
                className={styles.toggle}
                disabled={savingPref === 'notifyOnEventDeleted'}
                onClick={() => void handleTogglePref('notifyOnEventDeleted')}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

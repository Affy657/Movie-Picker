import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import {
  fetchNotificationPreferences,
  patchNotificationPreferences,
  type NotificationPreferences,
} from '@/features/notifications/api/notificationsApi';
import { useTranslation } from '@/shared/i18n';
import Toggle from '@/shared/components/Toggle';
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
          <Toggle
            checked={subscribed}
            disabled={pushLoading || permission === 'denied'}
            onChange={() => void (subscribed ? unsubscribe() : subscribe())}
            label={subscribed ? t('notifications.disableButton') : t('notifications.enableButton')}
          />
        </div>

        {subscribed && prefs && (
          <>
            <hr className={styles.prefsDivider} />
            <p className={styles.prefsTitle}>{t('notifications.prefsTitle')}</p>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefParticipantJoined')}</span>
              <Toggle
                checked={prefs.notifyOnParticipantJoined}
                label={t('notifications.prefParticipantJoined')}
                disabled={savingPref === 'notifyOnParticipantJoined'}
                onChange={() => handleTogglePref('notifyOnParticipantJoined')}
              />
            </div>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefEventReminder')}</span>
              <Toggle
                checked={prefs.notifyEventReminder}
                label={t('notifications.prefEventReminder')}
                disabled={savingPref === 'notifyEventReminder'}
                onChange={() => handleTogglePref('notifyEventReminder')}
              />
            </div>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefMovieAdded')}</span>
              <Toggle
                checked={prefs.notifyOnMovieAdded}
                label={t('notifications.prefMovieAdded')}
                disabled={savingPref === 'notifyOnMovieAdded'}
                onChange={() => handleTogglePref('notifyOnMovieAdded')}
              />
            </div>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefMoviePicked')}</span>
              <Toggle
                checked={prefs.notifyOnMoviePicked}
                label={t('notifications.prefMoviePicked')}
                disabled={savingPref === 'notifyOnMoviePicked'}
                onChange={() => handleTogglePref('notifyOnMoviePicked')}
              />
            </div>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefEventDeleted')}</span>
              <Toggle
                checked={prefs.notifyOnEventDeleted}
                label={t('notifications.prefEventDeleted')}
                disabled={savingPref === 'notifyOnEventDeleted'}
                onChange={() => handleTogglePref('notifyOnEventDeleted')}
              />
            </div>

            <div className={styles.prefRow}>
              <span className={styles.prefLabel}>{t('notifications.prefNewFollower')}</span>
              <Toggle
                checked={prefs.notifyOnNewFollower}
                label={t('notifications.prefNewFollower')}
                disabled={savingPref === 'notifyOnNewFollower'}
                onChange={() => handleTogglePref('notifyOnNewFollower')}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

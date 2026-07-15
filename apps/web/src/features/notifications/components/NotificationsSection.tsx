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
import { getErrorMessage } from '@/shared/api/apiError';
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
  const [prefsError, setPrefsError] = useState<string | null>(null);

  useEffect(() => {
    if (!subscribed) return;
    fetchNotificationPreferences()
      .then(setPrefs)
      .catch((err) => setPrefsError(getErrorMessage(err, t('notifications.prefsLoadError'))));
  }, [subscribed, t]);

  const handleTogglePref = useCallback(
    async (key: keyof NotificationPreferences) => {
      if (!prefs) return;
      setSavingPref(key);
      try {
        const updated = await patchNotificationPreferences({ [key]: !prefs[key] });
        setPrefs(updated);
        setPrefsError(null);
      } catch (err) {
        setPrefsError(getErrorMessage(err, t('notifications.prefsSaveError')));
      } finally {
        setSavingPref(null);
      }
    },
    [prefs, t]
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

      {prefsError && (
        <p className="error" role="alert">
          {prefsError}
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
              <span id="notif-pref-participant-joined" className={styles.prefLabel}>
                {t('notifications.prefParticipantJoined')}
              </span>
              <Toggle
                checked={prefs.notifyOnParticipantJoined}
                labelledBy="notif-pref-participant-joined"
                disabled={savingPref === 'notifyOnParticipantJoined'}
                onChange={() => handleTogglePref('notifyOnParticipantJoined')}
              />
            </div>

            <div className={styles.prefRow}>
              <span id="notif-pref-event-reminder" className={styles.prefLabel}>
                {t('notifications.prefEventReminder')}
              </span>
              <Toggle
                checked={prefs.notifyEventReminder}
                labelledBy="notif-pref-event-reminder"
                disabled={savingPref === 'notifyEventReminder'}
                onChange={() => handleTogglePref('notifyEventReminder')}
              />
            </div>

            <div className={styles.prefRow}>
              <span id="notif-pref-movie-added" className={styles.prefLabel}>
                {t('notifications.prefMovieAdded')}
              </span>
              <Toggle
                checked={prefs.notifyOnMovieAdded}
                labelledBy="notif-pref-movie-added"
                disabled={savingPref === 'notifyOnMovieAdded'}
                onChange={() => handleTogglePref('notifyOnMovieAdded')}
              />
            </div>

            <div className={styles.prefRow}>
              <span id="notif-pref-movie-picked" className={styles.prefLabel}>
                {t('notifications.prefMoviePicked')}
              </span>
              <Toggle
                checked={prefs.notifyOnMoviePicked}
                labelledBy="notif-pref-movie-picked"
                disabled={savingPref === 'notifyOnMoviePicked'}
                onChange={() => handleTogglePref('notifyOnMoviePicked')}
              />
            </div>

            <div className={styles.prefRow}>
              <span id="notif-pref-event-deleted" className={styles.prefLabel}>
                {t('notifications.prefEventDeleted')}
              </span>
              <Toggle
                checked={prefs.notifyOnEventDeleted}
                labelledBy="notif-pref-event-deleted"
                disabled={savingPref === 'notifyOnEventDeleted'}
                onChange={() => handleTogglePref('notifyOnEventDeleted')}
              />
            </div>

            <div className={styles.prefRow}>
              <span id="notif-pref-new-follower" className={styles.prefLabel}>
                {t('notifications.prefNewFollower')}
              </span>
              <Toggle
                checked={prefs.notifyOnNewFollower}
                labelledBy="notif-pref-new-follower"
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

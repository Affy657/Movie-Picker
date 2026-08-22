import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import {
  fetchNotificationPreferences,
  patchNotificationPreferences,
  type NotificationTypeKey,
} from '@/features/notifications/api/notificationsApi';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import Toggle from '@/shared/components/Toggle';
import { getErrorMessage } from '@/shared/api/apiError';
import { notifIcon } from '@/features/notifications/utils/notifIcon';
import styles from './NotificationsSection.module.css';

const PREF_TYPES: ReadonlyArray<{ type: NotificationTypeKey; labelKey: TranslationKey }> = [
  { type: 'participantjoined', labelKey: 'notifications.prefParticipantJoined' },
  { type: 'movieadded', labelKey: 'notifications.prefMovieAdded' },
  { type: 'moviepicked', labelKey: 'notifications.prefMoviePicked' },
  { type: 'moviepickedmanually', labelKey: 'notifications.prefMoviePickedManually' },
  { type: 'eventdeleted', labelKey: 'notifications.prefEventDeleted' },
  { type: 'eventreminder1h', labelKey: 'notifications.prefEventReminder1h' },
  { type: 'eventreminder24h', labelKey: 'notifications.prefEventReminder24h' },
  { type: 'eventinvitation', labelKey: 'notifications.prefEventInvitation' },
  { type: 'newfollower', labelKey: 'notifications.prefNewFollower' },
  { type: 'eventpending', labelKey: 'notifications.prefEventPending' },
  {
    type: 'letterboxdreconciliationpending',
    labelKey: 'notifications.prefLetterboxdReconciliationPending',
  },
];

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

  const [prefs, setPrefs] = useState<Record<NotificationTypeKey, boolean> | null>(null);
  const [savingPref, setSavingPref] = useState<NotificationTypeKey | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    fetchNotificationPreferences()
      .then((res) =>
        setPrefs(
          Object.fromEntries(res.preferences.map((p) => [p.type, p.enabled])) as Record<
            NotificationTypeKey,
            boolean
          >
        )
      )
      .catch((err) => setPrefsError(getErrorMessage(err, t('notifications.prefsLoadError'))));
  }, [supported, t]);

  const handleTogglePref = useCallback(
    async (type: NotificationTypeKey) => {
      if (!prefs) return;
      setSavingPref(type);
      try {
        const updated = await patchNotificationPreferences([{ type, enabled: !prefs[type] }]);
        setPrefs(
          Object.fromEntries(updated.preferences.map((p) => [p.type, p.enabled])) as Record<
            NotificationTypeKey,
            boolean
          >
        );
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
          <span className={styles.sectionTitleText}>{t('notifications.title')}</span>
        </h2>
        <p className="hint">{t('notifications.unsupported')}</p>
      </section>
    );
  }

  return (
    <section className="section section--panel" aria-labelledby="notifications-heading">
      <h2 id="notifications-heading" className={styles.sectionTitle}>
        <Bell size={18} aria-hidden />
        <span className={styles.sectionTitleText}>{t('notifications.title')}</span>
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

        {prefs && (
          <>
            <hr className={styles.prefsDivider} />
            <p className={styles.prefsTitle}>{t('notifications.prefsTitle')}</p>

            {PREF_TYPES.map(({ type, labelKey }) => (
              <div className={styles.prefRow} key={type}>
                <span className={styles.prefLabelWrap}>
                  <span className={styles.prefIcon} aria-hidden>
                    {notifIcon(type)}
                  </span>
                  <span id={`notif-pref-${type}`} className={styles.prefLabel}>
                    {t(labelKey)}
                  </span>
                </span>
                <Toggle
                  checked={prefs[type] ?? true}
                  labelledBy={`notif-pref-${type}`}
                  disabled={savingPref === type}
                  onChange={() => handleTogglePref(type)}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

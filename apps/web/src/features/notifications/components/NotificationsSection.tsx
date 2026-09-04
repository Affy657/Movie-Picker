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
import sharedStyles from '@/features/auth/pages/account/AccountShared.module.css';
import styles from './NotificationsSection.module.css';

interface PrefGroup {
  legendKey: TranslationKey;
  items: ReadonlyArray<{ type: NotificationTypeKey; labelKey: TranslationKey }>;
}

const PREF_GROUPS: readonly PrefGroup[] = [
  {
    legendKey: 'notifications.groupEvents',
    items: [
      { type: 'participantjoined', labelKey: 'notifications.prefParticipantJoined' },
      { type: 'movieadded', labelKey: 'notifications.prefMovieAdded' },
      { type: 'moviepicked', labelKey: 'notifications.prefMoviePicked' },
      { type: 'moviepickedmanually', labelKey: 'notifications.prefMoviePickedManually' },
      { type: 'eventdeleted', labelKey: 'notifications.prefEventDeleted' },
      { type: 'eventdatechanged', labelKey: 'notifications.prefEventDateChanged' },
      { type: 'eventpending', labelKey: 'notifications.prefEventPending' },
    ],
  },
  {
    legendKey: 'notifications.groupReminders',
    items: [
      { type: 'eventreminder1h', labelKey: 'notifications.prefEventReminder1h' },
      { type: 'eventreminder24h', labelKey: 'notifications.prefEventReminder24h' },
    ],
  },
  {
    legendKey: 'notifications.groupSocial',
    items: [
      { type: 'eventinvitation', labelKey: 'notifications.prefEventInvitation' },
      { type: 'newfollower', labelKey: 'notifications.prefNewFollower' },
      {
        type: 'letterboxdreconciliationpending',
        labelKey: 'notifications.prefLetterboxdReconciliationPending',
      },
    ],
  },
];

export default function NotificationsSection({ onSaved }: Readonly<{ onSaved?: () => void }> = {}) {
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
        onSaved?.();
      } catch (err) {
        setPrefsError(getErrorMessage(err, t('notifications.prefsSaveError')));
      } finally {
        setSavingPref(null);
      }
    },
    [prefs, t, onSaved]
  );

  const togglePush = () => {
    void (subscribed ? unsubscribe() : subscribe());
  };

  if (!supported) {
    return <p className="hint">{t('notifications.unsupported')}</p>;
  }

  return (
    <>
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

      <div className={sharedStyles.card}>
        <div className={sharedStyles.row} style={{ borderTop: 'none' }}>
          {subscribed ? (
            <Bell size={18} aria-hidden className={sharedStyles.rowIcon} />
          ) : (
            <BellOff size={18} aria-hidden className={sharedStyles.rowIcon} />
          )}
          <div className={sharedStyles.rowMain}>
            <p className={sharedStyles.rowLabel}>
              {subscribed ? t('notifications.enabledLabel') : t('notifications.disabledLabel')}
            </p>
          </div>
          <Toggle
            checked={subscribed}
            disabled={pushLoading || permission === 'denied'}
            onChange={togglePush}
            label={subscribed ? t('notifications.disableButton') : t('notifications.enableButton')}
          />
        </div>
      </div>

      {prefs && (
        <div className={sharedStyles.card}>
          {PREF_GROUPS.map((group) => (
            <fieldset className={styles.prefGroup} key={group.legendKey}>
              <legend className={styles.prefGroupLegend}>{t(group.legendKey)}</legend>
              {group.items.map(({ type, labelKey }) => (
                <div className={styles.prefRow} key={type}>
                  <span id={`notif-pref-${type}`} className={styles.prefLabel}>
                    {t(labelKey)}
                  </span>
                  <Toggle
                    checked={prefs[type] ?? true}
                    labelledBy={`notif-pref-${type}`}
                    disabled={savingPref === type}
                    onChange={() => handleTogglePref(type)}
                  />
                </div>
              ))}
            </fieldset>
          ))}
        </div>
      )}
    </>
  );
}

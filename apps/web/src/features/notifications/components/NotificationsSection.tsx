import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import {
  fetchNotificationPreferences,
  patchNotificationPreferences,
  type NotificationTypeKey,
} from '@/features/notifications/api/notificationsApi';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import {
  isIosRuntime,
  isStandaloneRuntime,
  usePwaInstallClick,
} from '@/shared/hooks/usePwaInstall';
import InstallPwaDialog from '@/shared/components/InstallPwaDialog';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import Toggle from '@/shared/components/Toggle';
import { getErrorMessage } from '@/shared/api/apiError';
import sharedStyles from '@/shared/components/SettingsSection.module.css';
import styles from './NotificationsSection.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

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

function NotificationsUnsupported() {
  const { t } = useTranslation();
  const install = usePwaInstallClick('notifications');
  const needsHomeScreen = isIosRuntime() && !isStandaloneRuntime();

  if (!needsHomeScreen) return <p className="hint">{t('notifications.unsupported')}</p>;

  return (
    <div className={styles.unsupportedIos}>
      <p className="hint">{t('notifications.unsupportedIos')}</p>
      {install.shouldShow ? (
        <Button type="button" size="sm" onClick={() => void install.onClick()}>
          {t('pwaInstall.trigger')}
        </Button>
      ) : null}
      {install.guideOpen ? (
        <InstallPwaDialog open mode={install.guideMode} onClose={install.closeGuide} />
      ) : null}
    </div>
  );
}

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
  }, [t]);

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
    if (subscribed) void unsubscribe();
    else void subscribe();
  };

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

      {supported ? (
        <Card padding="none" elevation="sm" className={sharedStyles.card}>
          <div className={clsx(sharedStyles.row, sharedStyles.noDivider)}>
            {subscribed ? (
              <Bell size={ICON_SIZE.lg} aria-hidden className={sharedStyles.rowIcon} />
            ) : (
              <BellOff size={ICON_SIZE.lg} aria-hidden className={sharedStyles.rowIcon} />
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
              ariaLabel={
                subscribed ? t('notifications.disableButton') : t('notifications.enableButton')
              }
            />
          </div>
        </Card>
      ) : (
        <NotificationsUnsupported />
      )}

      {prefs && (
        <Card padding="none" elevation="sm" className={sharedStyles.card}>
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
                    ariaLabelledBy={`notif-pref-${type}`}
                    disabled={savingPref === type}
                    onChange={() => handleTogglePref(type)}
                  />
                </div>
              ))}
            </fieldset>
          ))}
        </Card>
      )}
    </>
  );
}

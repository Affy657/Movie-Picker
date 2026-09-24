import { useCallback, useEffect, useState } from 'react';
import {
  deletePushSubscription,
  fetchVapidPublicKey,
  postPushSubscription,
} from '@/features/notifications/api/notificationsApi';
import {
  renewPushSubscriptionIfStale,
  vapidKeyBytes,
} from '@/features/notifications/utils/pushSubscriptionRenewal';
import { ApiError } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface PushNotificationsState {
  supported: boolean;
  permission: PermissionState;
  subscribed: boolean;
  loading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

async function currentSubscriptionOnServedKey(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  const subscription = await registration.pushManager.getSubscription();
  return subscription && renewPushSubscriptionIfStale(registration, subscription);
}

export function usePushNotifications(): PushNotificationsState {
  const { t } = useTranslation();
  const supported =
    globalThis.window !== undefined &&
    'serviceWorker' in navigator &&
    'PushManager' in globalThis &&
    'Notification' in globalThis;

  const [permission, setPermission] = useState<PermissionState>(
    supported ? (Notification.permission as PermissionState) : 'unsupported'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(supported);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;
    navigator.serviceWorker.ready
      .then(currentSubscriptionOnServedKey)
      .then((sub) => {
        if (!cancelled) {
          setSubscribed(sub !== null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported) return;
    setError(null);
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return;
      }

      const publicKey = await fetchVapidPublicKey();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyBytes(publicKey),
      });

      await postPushSubscription(sub.toJSON());
      setSubscribed(true);
    } catch (e) {
      setError(ApiError.is(e) ? e.message : t('notifications.enableError'));
    } finally {
      setLoading(false);
    }
  }, [supported, t]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setError(null);
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError(ApiError.is(e) ? e.message : t('notifications.disableError'));
    } finally {
      setLoading(false);
    }
  }, [supported, t]);

  return { supported, permission, subscribed, loading, error, subscribe, unsubscribe };
}

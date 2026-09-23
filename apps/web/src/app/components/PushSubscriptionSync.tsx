import { useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { postPushSubscription } from '@/features/notifications/api/notificationsApi';
import { currentBrowserPushSubscription } from '@/shared/utils/browserPushSubscription';

function notificationsAreGranted(): boolean {
  return globalThis.Notification?.permission === 'granted';
}

export default function PushSubscriptionSync() {
  const { user } = useAuth();
  const userId = user?.userId ?? null;

  useEffect(() => {
    if (!userId || !notificationsAreGranted()) return;
    let cancelled = false;
    currentBrowserPushSubscription()
      .then((subscription) => {
        if (cancelled || !subscription) return;
        return postPushSubscription(subscription.toJSON());
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}

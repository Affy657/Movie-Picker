import { useEffect } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { postPushSubscription } from '@/features/notifications/api/notificationsApi';
import { renewPushSubscriptionIfStale } from '@/features/notifications/utils/pushSubscriptionRenewal';
import { currentBrowserPushRegistration } from '@/shared/utils/browserPushSubscription';

function notificationsAreGranted(): boolean {
  return globalThis.Notification?.permission === 'granted';
}

async function registerThisBrowser(isCancelled: () => boolean): Promise<void> {
  const registration = await currentBrowserPushRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (isCancelled() || !registration || !subscription) return;
  const kept = await renewPushSubscriptionIfStale(registration, subscription);
  if (isCancelled() || kept !== subscription) return;
  await postPushSubscription(subscription.toJSON());
}

export default function PushSubscriptionSync() {
  const { user } = useAuth();
  const userId = user?.userId ?? null;

  useEffect(() => {
    if (!userId || !notificationsAreGranted()) return;
    let cancelled = false;
    registerThisBrowser(() => cancelled).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}

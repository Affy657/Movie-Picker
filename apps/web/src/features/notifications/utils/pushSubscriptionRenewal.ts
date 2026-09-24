import {
  deletePushSubscription,
  fetchVapidPublicKey,
  postPushSubscription,
} from '@/features/notifications/api/notificationsApi';

export function vapidKeyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const cleaned = base64.replaceAll(/[^A-Za-z0-9\-_]/g, '');
  const padded = cleaned.replaceAll('-', '+').replaceAll('_', '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const raw = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.codePointAt(i) ?? 0;
  return bytes;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

async function rotatedServerKey(
  subscription: PushSubscription
): Promise<Uint8Array<ArrayBuffer> | null> {
  const subscribedKey = subscription.options?.applicationServerKey;
  if (!subscribedKey) return null;
  const servedKey = vapidKeyBytes(await fetchVapidPublicKey());
  return sameBytes(new Uint8Array(subscribedKey), servedKey) ? null : servedKey;
}

export async function renewPushSubscriptionIfStale(
  registration: ServiceWorkerRegistration,
  subscription: PushSubscription
): Promise<PushSubscription | null> {
  let servedKey: Uint8Array<ArrayBuffer> | null;
  try {
    servedKey = await rotatedServerKey(subscription);
  } catch {
    return subscription;
  }
  if (!servedKey) return subscription;

  try {
    await subscription.unsubscribe();
    await deletePushSubscription(subscription.endpoint).catch(() => undefined);
    const renewed = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: servedKey,
    });
    await postPushSubscription(renewed.toJSON());
    return renewed;
  } catch {
    return registration.pushManager.getSubscription().catch(() => null);
  }
}

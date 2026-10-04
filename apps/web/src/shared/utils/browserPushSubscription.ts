function pushIsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in globalThis
  );
}

export async function currentBrowserPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushIsSupported()) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function currentBrowserPushSubscription(): Promise<PushSubscription | null> {
  const registration = await currentBrowserPushRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function dropBrowserPushSubscription(): Promise<void> {
  try {
    const subscription = await currentBrowserPushSubscription();
    await subscription?.unsubscribe();
  } catch {
    return;
  }
}

function pushIsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in globalThis
  );
}

export async function currentBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (!pushIsSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
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

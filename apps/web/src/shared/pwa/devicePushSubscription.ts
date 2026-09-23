export async function currentDevicePushSubscription(): Promise<PushSubscription | null> {
  if (globalThis.navigator?.serviceWorker === undefined) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return (await registration?.pushManager?.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

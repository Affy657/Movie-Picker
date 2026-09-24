import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  currentBrowserPushRegistration,
  currentBrowserPushSubscription,
  dropBrowserPushSubscription,
} from '@/shared/utils/browserPushSubscription';

function stubPushSupport(subscription: { unsubscribe: () => Promise<boolean> } | null) {
  vi.stubGlobal('PushManager', function PushManager() {});
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn(async () => ({
        pushManager: { getSubscription: vi.fn(async () => subscription) },
      })),
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('currentBrowserPushRegistration', () => {
  it('answers null where push is not supported', async () => {
    expect(await currentBrowserPushRegistration()).toBeNull();
  });

  it('returns the registration of the service worker that holds the subscription', async () => {
    const subscription = { unsubscribe: vi.fn(async () => true) };
    stubPushSupport(subscription);

    const registration = await currentBrowserPushRegistration();

    expect(await registration?.pushManager.getSubscription()).toBe(subscription);
  });
});

describe('currentBrowserPushSubscription', () => {
  it('answers null where push is not supported', async () => {
    expect(await currentBrowserPushSubscription()).toBeNull();
  });

  it('returns the subscription of the registered service worker', async () => {
    const subscription = { unsubscribe: vi.fn(async () => true) };
    stubPushSupport(subscription);

    expect(await currentBrowserPushSubscription()).toBe(subscription);
  });
});

describe('dropBrowserPushSubscription', () => {
  it('unsubscribes this browser so that nobody else receives the previous account notifications', async () => {
    const subscription = { unsubscribe: vi.fn(async () => true) };
    stubPushSupport(subscription);

    await dropBrowserPushSubscription();

    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('never fails the caller when the browser refuses', async () => {
    stubPushSupport({ unsubscribe: vi.fn(async () => Promise.reject(new Error('denied'))) });

    await expect(dropBrowserPushSubscription()).resolves.toBeUndefined();
  });
});

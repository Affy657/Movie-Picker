import { afterEach, describe, expect, it, vi } from 'vitest';
import {
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

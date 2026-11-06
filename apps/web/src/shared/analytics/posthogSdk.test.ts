import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type PostHogModule = typeof import('posthog-js');

type PageLoad = {
  analytics: typeof import('@/shared/analytics/posthog');
  sdk: PostHogModule['default'];
  events: string[];
};

const TOKEN = 'phc_test';
const CONSENT_KEY = `__ph_opt_in_out_${TOKEN}`;
const PERSISTENCE_KEY = `ph_${TOKEN}_posthog`;

function keepTheSdkOffTheNetwork(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {}))
  );
  vi.stubGlobal('XMLHttpRequest', vi.fn());
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: () => true });
}

async function loadPage(): Promise<PageLoad> {
  vi.resetModules();
  const { PostHog } = await vi.importActual<PostHogModule>('posthog-js');
  const sdk = new PostHog();
  vi.doMock('posthog-js', () => ({ default: sdk }));
  const analytics = await import('@/shared/analytics/posthog');
  const events: string[] = [];
  const init = sdk.init.bind(sdk);
  vi.spyOn(sdk, 'init').mockImplementation((...args: Parameters<typeof sdk.init>) => {
    const instance = init(...args);
    sdk.on('eventCaptured', (event) => events.push(event.event));
    return instance;
  });
  return { analytics, sdk, events };
}

function storedDistinctId(): string | undefined {
  const raw = localStorage.getItem(PERSISTENCE_KEY);
  return raw ? (JSON.parse(raw) as { distinct_id?: string }).distinct_id : undefined;
}

function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

describe('analytics on the real PostHog SDK', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_POSTHOG_KEY', TOKEN);
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      callback();
      return 1;
    });
    keepTheSdkOffTheNetwork();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.doUnmock('posthog-js');
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('sends one $pageview for a page, not two', async () => {
    const { analytics, events } = await loadPage();
    analytics.optIn();

    await analytics.initPostHog();
    await nextTick();

    expect(events.filter((name) => name === '$pageview')).toHaveLength(1);
  });

  it('keeps capturing after the identity reset of a sign-out', async () => {
    const { analytics, sdk, events } = await loadPage();
    analytics.optIn();
    await analytics.initPostHog();
    analytics.identify('user-1');
    const anonymousAfterSignIn = sdk.get_distinct_id();

    analytics.resetIdentity();
    sdk.capture('after_sign_out');

    expect(sdk.is_capturing()).toBe(true);
    expect(events).toContain('after_sign_out');
    expect(sdk.get_distinct_id()).not.toBe(anonymousAfterSignIn);
    expect(events.filter((name) => name === '$opt_in')).toHaveLength(1);
  });

  it('keeps a consenting visitor recognised from one page load to the next', async () => {
    const first = await loadPage();
    first.analytics.optIn();
    await first.analytics.initPostHog();
    await nextTick();
    const visitor = first.sdk.get_distinct_id();
    expect(storedDistinctId()).toBe(visitor);

    const second = await loadPage();
    second.analytics.optIn();
    await second.analytics.initPostHog();

    expect(second.sdk.get_distinct_id()).toBe(visitor);
  });

  it('recognises a consenting visitor whose consent an earlier reset wiped', async () => {
    const first = await loadPage();
    first.analytics.optIn();
    await first.analytics.initPostHog();
    await nextTick();
    const visitor = first.sdk.get_distinct_id();
    localStorage.removeItem(CONSENT_KEY);

    const second = await loadPage();
    second.analytics.optIn();
    await second.analytics.initPostHog();
    await nextTick();

    expect(second.sdk.is_capturing()).toBe(true);
    expect(storedDistinctId()).toBe(visitor);
  });

  it('leaves no PostHog identifier in the browser once consent is withdrawn', async () => {
    const { analytics, sdk } = await loadPage();
    analytics.optIn();
    await analytics.initPostHog();
    analytics.identify('user-1');
    await nextTick();

    analytics.optOut();
    await nextTick();

    expect(sdk.is_capturing()).toBe(false);
    expect(Object.keys(localStorage).filter((key) => key.startsWith('ph_'))).toEqual([]);
    expect(Object.keys(sessionStorage).filter((key) => key.startsWith('ph_'))).toEqual([]);
    expect(document.cookie).not.toContain('ph_');
  });

  it('writes nothing while consent is pending', async () => {
    const { analytics, sdk } = await loadPage();

    await analytics.initPostHog();
    await nextTick();

    expect(sdk.is_capturing()).toBe(false);
    expect(Object.keys(localStorage).filter((key) => key.startsWith('ph_'))).toEqual([]);
    expect(Object.keys(sessionStorage).filter((key) => key.startsWith('ph_'))).toEqual([]);
  });
});

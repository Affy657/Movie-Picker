import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { CaptureResult, PostHog } from 'posthog-js';
import {
  bindPostHogForTests,
  capture,
  identify,
  initPostHog,
  optIn,
  optOut,
  redactCapturedUrls,
  resetIdentity,
  resetPostHogForTests,
  stripPersonPii,
} from '@/shared/analytics/posthog';

function createStub(): PostHog {
  let optedIn = false;
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(() => {
      optedIn = false;
    }),
    unsetPersonProperties: vi.fn(),
    opt_in_capturing: vi.fn(() => {
      optedIn = true;
    }),
    opt_out_capturing: vi.fn(() => {
      optedIn = false;
    }),
    has_opted_in_capturing: vi.fn(() => optedIn),
    has_opted_out_capturing: vi.fn(() => !optedIn),
  } as unknown as PostHog;
}

describe('stripPersonPii', () => {
  it('retire displayName et handle sans muter l’objet source', () => {
    const source = { displayName: 'Ada', handle: 'ada', value: 1 };
    expect(stripPersonPii(source)).toEqual({ value: 1 });
    expect(source).toEqual({ displayName: 'Ada', handle: 'ada', value: 1 });
  });

  it('laisse passer undefined', () => {
    expect(stripPersonPii(undefined)).toBeUndefined();
  });
});

describe('file d’attente consentement / identify', () => {
  beforeEach(() => {
    resetPostHogForTests();
  });

  afterEach(() => {
    resetPostHogForTests();
  });

  it('applies the opt-in once the SDK is wired, and leaves the $pageview to the SDK', () => {
    const stub = createStub();
    optIn();
    bindPostHogForTests(stub);
    optIn();
    expect(stub.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(stub.capture).not.toHaveBeenCalled();
  });

  it('identifie sans PII et unset displayName/handle', () => {
    const stub = createStub();
    identify('user-1');
    bindPostHogForTests(stub);
    expect(stub.identify).toHaveBeenCalledWith('user-1');
    expect(stub.unsetPersonProperties).toHaveBeenCalledWith(['displayName', 'handle']);
  });

  it('opts back in without a new $opt_in event after an identity reset', () => {
    const stub = createStub();
    bindPostHogForTests(stub);
    optIn();
    identify('user-1');

    resetIdentity();

    expect(stub.reset).toHaveBeenCalledTimes(1);
    expect(stub.opt_in_capturing).toHaveBeenLastCalledWith({ captureEventName: false });
    expect(stub.has_opted_in_capturing()).toBe(true);
  });

  it('identifies the next account after an identity reset', () => {
    const stub = createStub();
    bindPostHogForTests(stub);
    optIn();
    identify('user-1');
    resetIdentity();

    identify('user-1');

    expect(stub.identify).toHaveBeenCalledTimes(2);
  });

  it('forgets the identity when consent is withdrawn, and stays out afterwards', () => {
    const stub = createStub();
    bindPostHogForTests(stub);
    optIn();
    identify('user-1');

    optOut();
    optOut();

    expect(stub.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(stub.reset).toHaveBeenCalledTimes(1);
    expect(stub.identify).toHaveBeenCalledTimes(1);
  });

  it('identifies again once consent is given back', () => {
    const stub = createStub();
    bindPostHogForTests(stub);
    optIn();
    identify('user-1');
    optOut();

    optIn();
    identify('user-1');

    expect(stub.identify).toHaveBeenCalledTimes(2);
  });

  it('removes what PostHog stored, even when the SDK never loaded in this page', () => {
    localStorage.setItem('ph_phc_test_posthog', '{"distinct_id":"visitor"}');
    sessionStorage.setItem('ph_phc_test_window_id', 'window');
    document.cookie = 'ph_phc_test_posthog=visitor; path=/';
    localStorage.setItem('moviepicker-consent', '{"decided":true,"analytics":false}');

    optOut();

    expect(localStorage.getItem('ph_phc_test_posthog')).toBeNull();
    expect(sessionStorage.getItem('ph_phc_test_window_id')).toBeNull();
    expect(document.cookie).not.toContain('ph_phc_test_posthog');
    expect(localStorage.getItem('moviepicker-consent')).not.toBeNull();
  });

  it('capture ignores the events as long as the SDK is not ready', () => {
    capture('vote_cast', { value: 1 });
    const stub = createStub();
    bindPostHogForTests(stub);
    capture('vote_cast', { value: 1, displayName: 'Ada' });
    expect(stub.capture).toHaveBeenCalledWith('vote_cast', { value: 1 });
  });
});

describe('initPostHog', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.doUnmock('posthog-js');
    resetPostHogForTests();
  });

  it('attend un temps libre du fil principal avant de charger le SDK', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    const idle: Array<() => void> = [];
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      idle.push(callback);
      return idle.length;
    });
    const init = vi.fn();
    vi.doMock('posthog-js', () => ({ default: { ...createStub(), init } }));

    const pending = initPostHog();
    await Promise.resolve();
    expect(init).not.toHaveBeenCalled();
    expect(idle).toHaveLength(1);

    idle[0]!();
    await pending;
    expect(init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({ autocapture: false, before_send: redactCapturedUrls })
    );
  });

  it('keeps heatmaps, dead clicks and exceptions off whatever the project settings, and masks the tokens', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      callback();
      return 1;
    });
    const init = vi.fn();
    vi.doMock('posthog-js', () => ({ default: { ...createStub(), init } }));

    await initPostHog();

    expect(init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        capture_heatmaps: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        mask_personal_data_properties: true,
        custom_personal_data_properties: expect.arrayContaining(['token', 'host', 'api_key']),
      })
    );
  });

  it('keeps nothing in the browser as long as consent is not given', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      callback();
      return 1;
    });
    const init = vi.fn();
    vi.doMock('posthog-js', () => ({ default: { ...createStub(), init } }));

    await initPostHog();

    expect(init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        opt_out_capturing_by_default: true,
        opt_out_persistence_by_default: true,
      })
    );
  });
});

describe('redactCapturedUrls', () => {
  it('masks the tokens of every URL an event carries, person properties included', () => {
    const event = {
      uuid: 'u1',
      event: '$pageview',
      properties: {
        $current_url: 'https://www.movie-picker.fr/reset?token=abc123',
        $pathname: '/reset',
        count: 2,
      },
      $set: { $current_url: 'https://www.movie-picker.fr/e/Ab3dE_9xYz?host=secret' },
      $set_once: { $initial_current_url: 'https://www.movie-picker.fr/reset?token=abc123' },
    } as CaptureResult;

    const redacted = redactCapturedUrls(event);

    expect(redacted?.properties).toEqual({
      $current_url: 'https://www.movie-picker.fr/reset?token=***',
      $pathname: '/reset',
      count: 2,
    });
    expect(redacted?.$set).toEqual({
      $current_url: 'https://www.movie-picker.fr/e/Ab3dE_9xYz?host=***',
    });
    expect(redacted?.$set_once).toEqual({
      $initial_current_url: 'https://www.movie-picker.fr/reset?token=***',
    });
  });

  it('masks the tokens of the URLs nested in objects and arrays, web vitals included', () => {
    const event = {
      uuid: 'u2',
      event: '$web_vitals',
      properties: {
        $web_vitals_LCP_value: 1200,
        $web_vitals_LCP_event: {
          name: 'LCP',
          value: 1200,
          $current_url: 'https://www.movie-picker.fr/reset?token=abc123',
          attribution: { url: 'https://www.movie-picker.fr/e/Ab3dE_9xYz?host=secret' },
        },
        $urls: ['https://www.movie-picker.fr/reset?token=abc123', 42, null],
      },
      $set: { $last_page: { href: 'https://www.movie-picker.fr/x?api_key=k' } },
    } as CaptureResult;

    const redacted = redactCapturedUrls(event);

    expect(redacted?.properties).toEqual({
      $web_vitals_LCP_value: 1200,
      $web_vitals_LCP_event: {
        name: 'LCP',
        value: 1200,
        $current_url: 'https://www.movie-picker.fr/reset?token=***',
        attribution: { url: 'https://www.movie-picker.fr/e/Ab3dE_9xYz?host=***' },
      },
      $urls: ['https://www.movie-picker.fr/reset?token=***', 42, null],
    });
    expect(redacted?.$set).toEqual({
      $last_page: { href: 'https://www.movie-picker.fr/x?api_key=***' },
    });
  });

  it('stops at a bounded depth and leaves the values that are not plain data untouched', () => {
    const cyclic: Record<string, unknown> = { url: '/reset?token=abc123' };
    cyclic.self = cyclic;
    const timestamp = new Date('2026-09-23T10:00:00Z');
    const event = {
      uuid: 'u3',
      event: 'custom',
      properties: { cyclic, when: timestamp },
      timestamp,
    } as CaptureResult;

    const redacted = redactCapturedUrls(event);

    expect(redacted?.properties.cyclic.url).toBe('/reset?token=***');
    expect(redacted?.properties.cyclic.self.url).toBe('/reset?token=***');
    expect(redacted?.properties.when).toBe(timestamp);
    expect(redacted?.timestamp).toBe(timestamp);
  });

  it('drops an event it cannot read rather than sending it unmasked', () => {
    const properties = {};
    Object.defineProperty(properties, '$current_url', {
      enumerable: true,
      get: () => {
        throw new Error('unreadable');
      },
    });

    expect(redactCapturedUrls({ uuid: 'u4', event: '$pageview', properties })).toBeNull();
  });

  it('keeps a dropped event dropped', () => {
    expect(redactCapturedUrls(null)).toBeNull();
  });
});

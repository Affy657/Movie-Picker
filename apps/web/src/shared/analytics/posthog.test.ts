import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { PostHog } from 'posthog-js';
import {
  bindPostHogForTests,
  capture,
  identify,
  initPostHog,
  optIn,
  optOut,
  resetIdentity,
  resetPostHogForTests,
  stripPersonPii,
} from '@/shared/analytics/posthog';

function createStub(): PostHog {
  const opted = { in: false, out: true };
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    unsetPersonProperties: vi.fn(),
    opt_in_capturing: vi.fn(() => {
      opted.in = true;
      opted.out = false;
    }),
    opt_out_capturing: vi.fn(() => {
      opted.in = false;
      opted.out = true;
    }),
    has_opted_in_capturing: vi.fn(() => opted.in),
    has_opted_out_capturing: vi.fn(() => opted.out),
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

  it('applies opt-in and pageview once the SDK is wired', () => {
    const stub = createStub();
    optIn();
    bindPostHogForTests(stub);
    expect(stub.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(stub.capture).toHaveBeenCalledWith('$pageview');
  });

  it('sends only one $pageview per session even when optIn is called again', () => {
    const stub = createStub();
    optIn();
    bindPostHogForTests(stub);
    optIn();
    expect(stub.capture).toHaveBeenCalledTimes(1);
  });

  it('identifie sans PII et unset displayName/handle', () => {
    const stub = createStub();
    identify('user-1');
    bindPostHogForTests(stub);
    expect(stub.identify).toHaveBeenCalledWith('user-1');
    expect(stub.unsetPersonProperties).toHaveBeenCalledWith(['displayName', 'handle']);
  });

  it('optOut then identity reset', () => {
    const stub = createStub();
    bindPostHogForTests(stub);
    optIn();
    identify('user-1');
    optOut();
    resetIdentity();
    expect(stub.opt_out_capturing).toHaveBeenCalled();
    expect(stub.reset).toHaveBeenCalled();
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
    expect(init).toHaveBeenCalledWith('phc_test', expect.objectContaining({ autocapture: false }));
  });
});

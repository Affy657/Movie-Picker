import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Breadcrumb, ErrorEvent } from '@sentry/react';
import {
  prepareBreadcrumb,
  prepareEvent,
  prepareTransaction,
  sentryTracePropagationTargets,
  shouldDropSentryEvent,
} from '@/shared/observability/sentry';

describe('token redaction', () => {
  it('masks the tokens of the request URL of an error event', () => {
    const event = {
      type: undefined,
      request: {
        url: 'https://www.movie-picker.fr/reset?token=abc123',
        query_string: 'token=abc123&lang=fr',
      },
    } as ErrorEvent;

    const prepared = prepareEvent(event);

    expect(prepared?.request?.url).toBe('https://www.movie-picker.fr/reset?token=***');
    expect(prepared?.request?.query_string).toBe('token=***&lang=fr');
  });

  it('masks the tokens of a transaction, its trace context and its spans', () => {
    const transaction = {
      type: 'transaction',
      request: { url: 'https://www.movie-picker.fr/reset?token=abc123' },
      contexts: {
        trace: { data: { 'url.full': 'https://www.movie-picker.fr/reset?token=abc123' } },
      },
      spans: [
        {
          data: {
            'url.full': 'https://api.movie-picker.fr/api/v1/x?host=secret',
            'http.method': 'GET',
          },
        },
      ],
    } as unknown as Parameters<typeof prepareTransaction>[0];

    const prepared = prepareTransaction(transaction);

    expect(prepared.request?.url).toBe('https://www.movie-picker.fr/reset?token=***');
    expect(prepared.contexts?.trace?.data?.['url.full']).toBe(
      'https://www.movie-picker.fr/reset?token=***'
    );
    expect(prepared.spans?.[0]?.data).toEqual({
      'url.full': 'https://api.movie-picker.fr/api/v1/x?host=***',
      'http.method': 'GET',
    });
  });

  it('drops the request headers of a transaction, where the Referer carries the page URL', () => {
    const transaction = {
      type: 'transaction',
      request: {
        url: 'https://www.movie-picker.fr/login',
        headers: {
          Referer: 'https://www.movie-picker.fr/reset?token=abc123',
          'User-Agent': 'Mozilla/5.0',
        },
      },
    } as unknown as Parameters<typeof prepareTransaction>[0];

    const prepared = prepareTransaction(transaction);

    expect(prepared.request).toEqual({ url: 'https://www.movie-picker.fr/login' });
  });

  it('masks the tokens of navigation and request breadcrumbs', () => {
    const navigation: Breadcrumb = {
      category: 'navigation',
      data: { from: '/reset?token=abc123', to: '/login', status_code: 200 },
    };
    const request: Breadcrumb = {
      category: 'fetch',
      type: 'http',
      data: {
        method: 'GET',
        url: 'https://api.movie-picker.fr/api/v1/events/slug/Ab3dE_9xYz?host=secret',
        status_code: 200,
      },
    };

    expect(prepareBreadcrumb(navigation).data).toEqual({
      from: '/reset?token=***',
      to: '/login',
      status_code: 200,
    });
    expect(prepareBreadcrumb(request).data).toEqual({
      method: 'GET',
      url: 'https://api.movie-picker.fr/api/v1/events/slug/Ab3dE_9xYz?host=***',
      status_code: 200,
    });
  });
});

describe('shouldDropSentryEvent', () => {
  it('discards the bridge injected by the Snapchat in-app browser', () => {
    expect(
      shouldDropSentryEvent({
        exception: { values: [{ value: "Can't find variable: SCDynimacBridge" }] },
      })
    ).toBe(true);
  });

  it('conserve une erreur applicative', () => {
    expect(
      shouldDropSentryEvent({
        exception: { values: [{ value: 'Cannot read properties of undefined' }] },
      })
    ).toBe(false);
  });

  it('keeps an event without exception', () => {
    expect(shouldDropSentryEvent({})).toBe(false);
  });
});

describe('sentryTracePropagationTargets', () => {
  it("extrait l'origine HTTPS de l'API", () => {
    expect(sentryTracePropagationTargets('https://api.movie-picker.fr')).toEqual([
      'https://api.movie-picker.fr',
    ]);
  });

  it('adds https when the scheme is missing', () => {
    expect(sentryTracePropagationTargets('api.movie-picker.fr/v1')).toEqual([
      'https://api.movie-picker.fr',
    ]);
  });

  it('ignore une URL vide ou invalide', () => {
    expect(sentryTracePropagationTargets('')).toEqual([]);
    expect(sentryTracePropagationTargets('not a url')).toEqual([]);
  });
});

describe('initSentry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@o1.ingest.de.sentry.io/1');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('replays the errors captured before the SDK loaded', async () => {
    const init = vi.fn();
    const captureException = vi.fn();
    vi.doMock('@sentry/react', () => ({
      init,
      captureException,
      browserTracingIntegration: () => ({ name: 'BrowserTracing' }),
    }));
    const sentry = await import('./sentry');
    const early = new Error('avant le chargement');

    sentry.captureException(early, 'stack');
    expect(captureException).not.toHaveBeenCalled();
    await sentry.initSentry();

    expect(init).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(early, {
      contexts: { react: { componentStack: 'stack' } },
    });
  });

  it('bounds the queue of errors captured before the SDK', async () => {
    const captureException = vi.fn();
    vi.doMock('@sentry/react', () => ({
      init: vi.fn(),
      captureException,
      browserTracingIntegration: () => ({ name: 'BrowserTracing' }),
    }));
    const sentry = await import('./sentry');

    for (let index = 0; index < 30; index++) sentry.captureException(new Error(`e${index}`));
    await sentry.initSentry();

    expect(captureException).toHaveBeenCalledTimes(20);
    expect((captureException.mock.calls[0]![0] as Error).message).toBe('e10');
  });

  it('does not leave a rejected promise unhandled when the SDK fails to load', async () => {
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.doMock('@sentry/react', () => {
      throw new Error('chunk introuvable');
    });
    const sentry = await import('./sentry');

    sentry.scheduleSentryStart();
    await new Promise((resolve) => setTimeout(resolve, 50));

    vi.unstubAllGlobals();
    await expect(sentry.initSentry()).rejects.toThrow();
  });

  it("instrumente la navigation sans envelopper les routes de l'application", async () => {
    const init = vi.fn();
    const browserTracingIntegration = vi.fn(() => ({ name: 'BrowserTracing' }));
    vi.doMock('@sentry/react', () => ({
      init,
      captureException: vi.fn(),
      browserTracingIntegration,
    }));
    const sentry = await import('./sentry');

    await sentry.initSentry();

    expect(browserTracingIntegration).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({ integrations: [{ name: 'BrowserTracing' }] })
    );
  });

  it('ne charge le SDK qu’une fois le fil principal libre', async () => {
    vi.useFakeTimers();
    const init = vi.fn();
    vi.doMock('@sentry/react', () => ({
      init,
      captureException: vi.fn(),
      browserTracingIntegration: () => ({ name: 'BrowserTracing' }),
    }));
    const idle = vi.fn((callback: () => void) => {
      setTimeout(callback, 0);
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', idle);
    const sentry = await import('./sentry');

    sentry.scheduleSentryStart();

    expect(idle).not.toHaveBeenCalled();
    expect(init).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10000);
    expect(idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });
    await vi.runAllTimersAsync();
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('attend la fin du chargement de la page puis dix secondes avant de guetter le temps libre', async () => {
    vi.useFakeTimers();
    const init = vi.fn();
    vi.doMock('@sentry/react', () => ({
      init,
      captureException: vi.fn(),
      browserTracingIntegration: () => ({ name: 'BrowserTracing' }),
    }));
    const idle = vi.fn((callback: () => void) => {
      setTimeout(callback, 0);
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', idle);
    const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('interactive');
    const sentry = await import('./sentry');

    sentry.scheduleSentryStart();

    expect(idle).not.toHaveBeenCalled();
    readyState.mockReturnValue('complete');
    window.dispatchEvent(new Event('load'));
    expect(idle).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(9999);
    expect(idle).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(idle).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    expect(init).toHaveBeenCalledTimes(1);
    readyState.mockRestore();
  });

  it('starts the SDK at the first interaction, without waiting for the delay', async () => {
    vi.useFakeTimers();
    const init = vi.fn();
    vi.doMock('@sentry/react', () => ({
      init,
      captureException: vi.fn(),
      browserTracingIntegration: () => ({ name: 'BrowserTracing' }),
    }));
    const idle = vi.fn((callback: () => void) => {
      setTimeout(callback, 0);
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', idle);
    const sentry = await import('./sentry');

    sentry.scheduleSentryStart();
    expect(idle).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('pointerdown'));

    expect(idle).toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(init).toHaveBeenCalledTimes(1);
    const armed = idle.mock.calls.length;
    window.dispatchEvent(new Event('keydown'));
    expect(idle.mock.calls).toHaveLength(armed);
  });
});

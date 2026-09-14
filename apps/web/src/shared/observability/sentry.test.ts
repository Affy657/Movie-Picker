import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sentryTracePropagationTargets,
  shouldDropSentryEvent,
} from '@/shared/observability/sentry';

describe('shouldDropSentryEvent', () => {
  it('écarte le pont injecté par le navigateur intégré Snapchat', () => {
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

  it('conserve un événement sans exception', () => {
    expect(shouldDropSentryEvent({})).toBe(false);
  });
});

describe('sentryTracePropagationTargets', () => {
  it("extrait l'origine HTTPS de l'API", () => {
    expect(sentryTracePropagationTargets('https://api.movie-picker.fr')).toEqual([
      'https://api.movie-picker.fr',
    ]);
  });

  it('ajoute https si le schéma manque', () => {
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

  it('rejoue les erreurs capturées avant que le SDK soit chargé', async () => {
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

  it('borne la file des erreurs capturées avant le SDK', async () => {
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

  it('ne laisse pas une promesse rejetée sans suite si le SDK ne se charge pas', async () => {
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.doMock('@sentry/react', () => {
      throw new Error('chunk introuvable');
    });
    const sentry = await import('./sentry');

    sentry.startSentryWhenIdle();
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

    sentry.startSentryWhenIdle();

    expect(idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });
    expect(init).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(init).toHaveBeenCalledTimes(1);
  });
});

import type { ErrorEvent } from '@sentry/react';

type SentryApi = typeof import('@sentry/react');

let api: SentryApi | null = null;
let loading: Promise<void> | null = null;

const IN_APP_BROWSER_NOISE = /SCDynimacBridge/i;
const IDLE_INIT_TIMEOUT_MS = 3000;
const START_DELAY_AFTER_LOAD_MS = 10000;
const FIRST_INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;

type PendingCapture = { error: unknown; componentStack?: string };
const MAX_CAPTURES_BEFORE_INIT = 20;
const capturedBeforeInit: Array<PendingCapture> = [];

export function shouldDropSentryEvent(event: {
  exception?: { values?: Array<{ value?: string }> };
}): boolean {
  const values = event.exception?.values ?? [];
  return values.some((item) => IN_APP_BROWSER_NOISE.test(item.value ?? ''));
}

export function sentryTracePropagationTargets(
  apiUrl = import.meta.env.VITE_API_URL
): Array<string> {
  const raw = (apiUrl ?? '').trim();
  if (!raw) return [];
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return [new URL(withScheme).origin];
  } catch {
    return [];
  }
}

function prepareEvent(event: ErrorEvent): ErrorEvent | null {
  if (shouldDropSentryEvent(event)) return null;
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
  }
  return event;
}

function sendToSentry(sentry: SentryApi, { error, componentStack }: PendingCapture): void {
  sentry.captureException(
    error,
    componentStack ? { contexts: { react: { componentStack } } } : undefined
  );
}

async function loadAndInit(dsn: string): Promise<void> {
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: 'production',
    tracesSampleRate: 0.1,
    tracePropagationTargets: sentryTracePropagationTargets(),
    integrations: [Sentry.browserTracingIntegration()],
    sendDefaultPii: false,
    ignoreErrors: ['SCDynimacBridge'],
    beforeSend: prepareEvent,
  });
  api = Sentry;
  for (const pending of capturedBeforeInit.splice(0)) sendToSentry(Sentry, pending);
}

export function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (api || !dsn || !import.meta.env.PROD) return Promise.resolve();
  loading ??= loadAndInit(dsn);
  return loading;
}

function whenMainThreadIsIdle(start: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(start, { timeout: IDLE_INIT_TIMEOUT_MS });
    return;
  }
  setTimeout(start, 0);
}

function whenPageIsLoaded(callback: () => void): void {
  if (document.readyState === 'complete') {
    callback();
    return;
  }
  window.addEventListener('load', callback, { once: true });
}

function whenUserInteractsOrAfter(delayMs: number, callback: () => void): void {
  let fired = false;
  const fire = (): void => {
    if (fired) return;
    fired = true;
    clearTimeout(timer);
    for (const type of FIRST_INTERACTION_EVENTS) window.removeEventListener(type, fire);
    callback();
  };
  const timer = setTimeout(fire, delayMs);
  for (const type of FIRST_INTERACTION_EVENTS) {
    window.addEventListener(type, fire, { once: true, passive: true });
  }
}

export function scheduleSentryStart(): void {
  const start = (): void => {
    initSentry().catch(() => {
      loading = null;
    });
  };
  whenPageIsLoaded(() =>
    whenUserInteractsOrAfter(START_DELAY_AFTER_LOAD_MS, () => whenMainThreadIsIdle(start))
  );
}

export function captureException(error: unknown, componentStack?: string): void {
  if (api) {
    sendToSentry(api, { error, componentStack });
    return;
  }
  capturedBeforeInit.push({ error, componentStack });
  if (capturedBeforeInit.length > MAX_CAPTURES_BEFORE_INIT) capturedBeforeInit.shift();
}

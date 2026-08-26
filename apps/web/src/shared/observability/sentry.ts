import type { ErrorEvent } from '@sentry/react';

type SentryApi = typeof import('@sentry/react');

let api: SentryApi | null = null;

const IN_APP_BROWSER_NOISE = /SCDynimacBridge/i;

export function shouldDropSentryEvent(event: {
  exception?: { values?: Array<{ value?: string }> };
}): boolean {
  const values = event.exception?.values ?? [];
  return values.some((item) => IN_APP_BROWSER_NOISE.test(item.value ?? ''));
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

export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (api || !dsn || !import.meta.env.PROD) return;
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: 'production',
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
    sendDefaultPii: false,
    ignoreErrors: ['SCDynimacBridge'],
    beforeSend: prepareEvent,
  });
  api = Sentry;
}

export function captureException(error: unknown, componentStack?: string): void {
  if (!api) return;
  api.captureException(
    error,
    componentStack ? { contexts: { react: { componentStack } } } : undefined
  );
}

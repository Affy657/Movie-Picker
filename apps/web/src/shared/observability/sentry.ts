import type { ErrorEvent } from '@sentry/react';

type SentryApi = typeof import('@sentry/react');

let api: SentryApi | null = null;

function stripPii(event: ErrorEvent): ErrorEvent {
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
    beforeSend: stripPii,
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

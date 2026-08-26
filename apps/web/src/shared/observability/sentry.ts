import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router';
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

type InstrumentedRoutes = Parameters<SentryApi['withSentryReactRouterV7Routing']>[0];

export function getInstrumentedRoutes(routesComponent: InstrumentedRoutes): InstrumentedRoutes {
  return api ? api.withSentryReactRouterV7Routing(routesComponent) : routesComponent;
}

export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (api || !dsn || !import.meta.env.PROD) return;
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: 'production',
    tracesSampleRate: 0.1,
    tracePropagationTargets: sentryTracePropagationTargets(),
    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
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

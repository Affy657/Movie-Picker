import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(): void {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key || !import.meta.env.PROD) return;
  posthog.init(key, {
    api_host: 'https://eu.i.posthog.com',
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: true,
    opt_out_capturing_by_default: true,
  });
  initialized = true;
}

export function capture(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function identify(userId: string, props: { displayName: string; handle: string }): void {
  if (!initialized) return;
  posthog.identify(userId, props);
}

export function resetIdentity(): void {
  if (!initialized) return;
  posthog.reset();
}

export function optIn(): void {
  if (!initialized || posthog.has_opted_in_capturing()) return;
  posthog.opt_in_capturing();
}

export function optOut(): void {
  if (!initialized || posthog.has_opted_out_capturing()) return;
  posthog.opt_out_capturing();
}

import type { PostHog } from 'posthog-js';

let posthog: PostHog | null = null;
let initialized = false;

export async function initPostHog(): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key || !import.meta.env.PROD || initialized) return;
  const { default: ph } = await import('posthog-js');
  ph.init(key, {
    api_host: 'https://eu.i.posthog.com',
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_performance: { web_vitals: true },
    disable_session_recording: true,
    opt_out_capturing_by_default: true,
  });
  posthog = ph;
  initialized = true;
}

export function capture(event: string, properties?: Record<string, unknown>): void {
  if (!initialized || !posthog) return;
  posthog.capture(event, properties);
}

export function identify(userId: string, props: { displayName: string; handle: string }): void {
  if (!initialized || !posthog) return;
  posthog.identify(userId, props);
}

export function resetIdentity(): void {
  if (!initialized || !posthog) return;
  posthog.reset();
}

export function optIn(): void {
  if (!initialized || !posthog || posthog.has_opted_in_capturing()) return;
  posthog.opt_in_capturing();
}

export function optOut(): void {
  if (!initialized || !posthog || posthog.has_opted_out_capturing()) return;
  posthog.opt_out_capturing();
}

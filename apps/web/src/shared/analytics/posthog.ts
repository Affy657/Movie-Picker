import type { PostHog, Properties } from 'posthog-js';

const PERSON_PII_KEYS = ['displayName', 'handle'] as const;

let posthog: PostHog | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;
let pendingConsent: boolean | null = null;
let pendingUserId: string | null | undefined;
let identifiedUserId: string | null = null;
let sessionPageviewSent = false;

export function stripPersonPii(properties?: Properties): Properties | undefined {
  if (!properties) return properties;
  const next = { ...properties };
  for (const key of PERSON_PII_KEYS) {
    delete next[key];
  }
  return next;
}

function applyOptIn(): void {
  if (!posthog) return;
  if (!posthog.has_opted_in_capturing()) {
    posthog.opt_in_capturing();
  }
  if (!sessionPageviewSent) {
    posthog.capture('$pageview');
    sessionPageviewSent = true;
  }
}

function applyOptOut(): void {
  if (!posthog) return;
  if (!posthog.has_opted_out_capturing()) {
    posthog.opt_out_capturing();
  }
  sessionPageviewSent = false;
}

function applyIdentify(userId: string): void {
  if (!posthog || identifiedUserId === userId) return;
  posthog.identify(userId);
  posthog.unsetPersonProperties([...PERSON_PII_KEYS]);
  identifiedUserId = userId;
}

function applyResetIdentity(): void {
  if (!posthog) return;
  posthog.reset();
  identifiedUserId = null;
}

function flushPending(): void {
  if (!initialized || !posthog) return;
  if (pendingConsent === true) applyOptIn();
  else if (pendingConsent === false) applyOptOut();
  if (pendingUserId === null) {
    applyResetIdentity();
    pendingUserId = undefined;
  } else if (typeof pendingUserId === 'string') {
    applyIdentify(pendingUserId);
  }
}

async function doInit(): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key || !import.meta.env.PROD) return;
  const { default: ph } = await import('posthog-js');
  ph.init(key, {
    api_host: 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_performance: { web_vitals: true },
    disable_session_recording: true,
    disable_surveys: true,
    opt_out_capturing_by_default: true,
    person_profiles: 'identified_only',
    sanitize_properties: (properties) => stripPersonPii(properties) ?? {},
  });
  posthog = ph;
  initialized = true;
  flushPending();
}

export function initPostHog(): Promise<void> {
  if (initialized) return Promise.resolve();
  initPromise ??= doInit();
  return initPromise;
}

export function capture(event: string, properties?: Record<string, unknown>): void {
  if (!initialized || !posthog) return;
  posthog.capture(event, stripPersonPii(properties));
}

export function identify(userId: string): void {
  pendingUserId = userId;
  flushPending();
}

export function resetIdentity(): void {
  pendingUserId = null;
  flushPending();
}

export function optIn(): void {
  pendingConsent = true;
  flushPending();
}

export function optOut(): void {
  pendingConsent = false;
  flushPending();
}

export function bindPostHogForTests(instance: PostHog): void {
  posthog = instance;
  initialized = true;
  flushPending();
}

export function resetPostHogForTests(): void {
  posthog = null;
  initialized = false;
  initPromise = null;
  pendingConsent = null;
  pendingUserId = undefined;
  identifiedUserId = null;
  sessionPageviewSent = false;
}

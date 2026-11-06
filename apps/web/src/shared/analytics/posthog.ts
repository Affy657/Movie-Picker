import type { CaptureResult, PostHog, Properties } from 'posthog-js';
import { redactSensitiveUrl, SENSITIVE_QUERY_PARAMETERS } from '@/shared/utils/sensitiveUrl';

const PERSON_PII_KEYS = ['displayName', 'handle'] as const;

const MAX_REDACTION_DEPTH = 5;

const STORED_DATA_PREFIX = 'ph_';

let posthog: PostHog | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;
let pendingConsent: boolean | null = null;
let pendingUserId: string | null | undefined;
let identifiedUserId: string | null = null;

export function stripPersonPii(properties?: Properties): Properties | undefined {
  if (!properties) return properties;
  const next = { ...properties };
  for (const key of PERSON_PII_KEYS) {
    delete next[key];
  }
  return next;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function redactUrlsDeep(value: unknown, depth: number): unknown {
  if (typeof value === 'string') return redactSensitiveUrl(value);
  if (depth >= MAX_REDACTION_DEPTH) return value;
  if (Array.isArray(value)) return value.map((item: unknown) => redactUrlsDeep(item, depth + 1));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactUrlsDeep(item, depth + 1)])
  );
}

function redactProperties<T extends Properties | undefined>(properties: T): T {
  return redactUrlsDeep(properties, 0) as T;
}

export function redactCapturedUrls(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  try {
    return {
      ...event,
      properties: redactProperties(event.properties),
      $set: redactProperties(event.$set),
      $set_once: redactProperties(event.$set_once),
    };
  } catch {
    return null;
  }
}

function removeStoredKeys(storage: Storage): void {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) {
    if (key?.startsWith(STORED_DATA_PREFIX)) storage.removeItem(key);
  }
}

function cookieDomains(hostname: string): string[] {
  const labels = hostname.split('.');
  return labels.slice(0, -1).map((_, index) => labels.slice(index).join('.'));
}

function expireCookie(name: string): void {
  const expired = `${name}=; Max-Age=0; path=/`;
  document.cookie = expired;
  for (const domain of cookieDomains(globalThis.location.hostname)) {
    document.cookie = `${expired}; domain=.${domain}`;
  }
}

function removeStoredCookies(): void {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name?.startsWith(STORED_DATA_PREFIX)) expireCookie(name);
  }
}

function clearStoredData(): void {
  if (globalThis.window === undefined) return;
  try {
    removeStoredKeys(localStorage);
    removeStoredKeys(sessionStorage);
    removeStoredCookies();
  } catch {
    return;
  }
}

function applyOptIn(): void {
  if (!posthog?.has_opted_out_capturing()) return;
  posthog.opt_in_capturing();
}

function applyOptOut(): void {
  if (posthog && !posthog.has_opted_out_capturing()) {
    posthog.opt_out_capturing();
    posthog.reset();
    identifiedUserId = null;
  }
  clearStoredData();
}

function applyIdentify(userId: string): void {
  if (!posthog || identifiedUserId === userId) return;
  posthog.identify(userId);
  posthog.unsetPersonProperties([...PERSON_PII_KEYS]);
  identifiedUserId = userId;
}

function applyResetIdentity(): void {
  if (!posthog) return;
  const consented = posthog.has_opted_in_capturing();
  posthog.reset();
  identifiedUserId = null;
  if (consented) posthog.opt_in_capturing({ captureEventName: false });
}

function flushPending(): void {
  if (pendingConsent === false) {
    pendingUserId = undefined;
    applyOptOut();
    return;
  }
  if (!initialized || !posthog) return;
  if (pendingConsent === true) applyOptIn();
  if (pendingUserId === null) {
    applyResetIdentity();
    pendingUserId = undefined;
  } else if (typeof pendingUserId === 'string') {
    applyIdentify(pendingUserId);
  }
}

const IDLE_LOAD_TIMEOUT_MS = 5000;

function mainThreadIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: IDLE_LOAD_TIMEOUT_MS });
      return;
    }
    setTimeout(resolve, 0);
  });
}

async function doInit(): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key || !import.meta.env.PROD) return;
  await mainThreadIdle();
  const { default: ph } = await import('posthog-js');
  ph.init(key, {
    api_host: 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_performance: { web_vitals: true },
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    mask_personal_data_properties: true,
    custom_personal_data_properties: [...SENSITIVE_QUERY_PARAMETERS],
    disable_session_recording: true,
    disable_surveys: true,
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    person_profiles: 'identified_only',
    sanitize_properties: (properties) => stripPersonPii(properties) ?? {},
    before_send: redactCapturedUrls,
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
}

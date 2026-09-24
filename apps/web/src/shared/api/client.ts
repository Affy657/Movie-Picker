import { ApiError } from '@/shared/api/apiError';
import { interpolate, loadedLocale, preferredLocale, t, type TranslationKey } from '@/shared/i18n';

function hostLooksLocal(host: string): boolean {
  const h = (host.split(':')[0] ?? host).toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
}

function getApiBase(): string {
  const raw = import.meta.env?.VITE_API_URL || 'http://localhost:4000';
  const base = (typeof raw === 'string' ? raw : '').trim();
  if (base && !/^https?:\/\//i.test(base)) {
    const withoutSlash = base.replace(/^\//, '');
    const hostPart = ((withoutSlash.split('/')[0] ?? '').split('@').pop() ?? withoutSlash).trim();
    const scheme = hostLooksLocal(hostPart) ? 'http' : 'https';
    return `${scheme}://${withoutSlash}`;
  }
  return base || 'http://localhost:4000';
}

const API_BASE = getApiBase();

const IS_DEV = import.meta.env?.DEV === true;

export const API_VERSION_PREFIX = '/api/v1';

export const HOST_TOKEN_HEADER = 'X-Host-Token';

export function withHostToken(
  hostToken: string | null | undefined,
  init: RequestInit = {}
): RequestInit {
  if (!hostToken) return init;
  return {
    ...init,
    headers: { ...mergeRequestHeaders(init.headers), [HOST_TOKEN_HEADER]: hostToken },
  };
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE.replace(/\/$/, '');
  if (p.startsWith('/api/') || p === '/health') {
    return `${base}${p}`;
  }
  return `${base}${API_VERSION_PREFIX}${p}`;
}

const COLLAPSIBLE_PATH_SEGMENTS = new Set(['', '.', '..']);

function encodePathSegment(segment: string | number): string {
  const text = String(segment);
  if (COLLAPSIBLE_PATH_SEGMENTS.has(text)) throw new Error('Invalid API path segment');
  return encodeURIComponent(text);
}

export function apiPath(...segments: ReadonlyArray<string | number>): string {
  return `/${segments.map(encodePathSegment).join('/')}`;
}

function userFacing(key: TranslationKey): string {
  return t(key, undefined, preferredLocale());
}

type ApiErrorParams = Record<string, string | number>;

function translateApiReason(
  reason: string,
  params: ApiErrorParams | undefined
): string | undefined {
  const messages = loadedLocale(preferredLocale())?.apiErrors;
  if (!messages || !Object.hasOwn(messages, reason)) return undefined;
  const template = messages[reason as keyof typeof messages];
  return params ? interpolate(template, params) : template;
}

function readApiErrorParams(raw: unknown): ApiErrorParams | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const params: ApiErrorParams = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' || typeof value === 'number') params[key] = value;
  }
  return params;
}

function misconfigurationMessage(): string {
  return IS_DEV
    ? 'Misconfiguration: the API URL points to this site instead of the API. ' +
        'Check the VITE_API_URL secret (it must be the Cloud Run URL, e.g. https://xxx.run.app), ' +
        'then redeploy the front and hard-reload (Ctrl+Shift+R).'
    : userFacing('errors.api.unavailable');
}

function ensureApiIsNotFrontOrigin(url: string): void {
  if (globalThis.window === undefined) return;
  let apiOrigin: string;
  try {
    apiOrigin = new URL(url).origin;
  } catch {
    return;
  }
  if (apiOrigin === globalThis.location.origin) {
    throw new ApiError(misconfigurationMessage(), { code: 0 });
  }
}

function networkErrorMessage(): string {
  return IS_DEV
    ? 'Unable to reach the API. Check that the API is running (pnpm dev:api-dotnet) and your connection.'
    : userFacing('errors.api.network');
}

function mergeRequestHeaders(init?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};
  if (init == null) return out;
  if (init instanceof Headers) {
    init.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(init)) {
    for (const [k, v] of init) out[k] = v;
    return out;
  }
  Object.assign(out, init);
  return out;
}

function htmlResponseMessage(): string {
  return IS_DEV
    ? 'The API returned HTML instead of JSON. Check that VITE_API_URL points to the API URL (e.g. Cloud Run), not to the website.'
    : userFacing('errors.api.server');
}

function looksLikeHtml(isJson: boolean, text: string): boolean {
  return !isJson && text.trimStart().startsWith('<');
}

function buildRequestHeaders(options?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = { ...mergeRequestHeaders(options?.headers) };
  if (options?.body != null && options.body !== '') {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

function rethrowFetchError(e: unknown): never {
  if (e instanceof DOMException && e.name === 'AbortError') throw e;
  if (e instanceof Error && e.name === 'AbortError') throw e;
  const msg = e instanceof Error ? e.message : String(e);
  const isNetwork =
    typeof msg === 'string' &&
    (msg.toLowerCase().includes('fetch') ||
      msg.toLowerCase().includes('network') ||
      e instanceof TypeError);
  throw new ApiError(isNetwork ? networkErrorMessage() : msg, { code: 0 });
}

function statusMessage(status: number): string {
  if (status === 429) return userFacing('apiErrors.rate_limited');
  if (status === 503) return userFacing('errors.api.unavailable');
  if (status >= 500) return userFacing('errors.api.server');
  return userFacing('errors.generic');
}

function readRetryAfterMs(res: Response): number | undefined {
  const raw = res.headers.get('retry-after')?.trim();
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(raw);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
}

type ErrorBody = { error?: unknown; reason?: unknown; params?: unknown };

function parseErrorBody(text: string, isJson: boolean): ErrorBody {
  if (!isJson || !text.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === 'object' ? (parsed as ErrorBody) : {};
  } catch {
    return {};
  }
}

function handleErrorResponse(res: Response, text: string, isJson: boolean): never {
  if (looksLikeHtml(isJson, text)) {
    throw new ApiError(htmlResponseMessage(), { code: res.status });
  }
  const parsed = parseErrorBody(text, isJson);
  const reason = typeof parsed.reason === 'string' ? parsed.reason : undefined;
  const translated = reason
    ? translateApiReason(reason, readApiErrorParams(parsed.params))
    : undefined;
  const serverMessage =
    typeof parsed.error === 'string' && parsed.error.trim() ? parsed.error : undefined;
  throw new ApiError(translated ?? serverMessage ?? statusMessage(res.status), {
    code: res.status,
    reason,
    retryAfterMs: readRetryAfterMs(res),
  });
}

function parseSuccessBody<T>(res: Response, text: string, isJson: boolean): T {
  if (res.status === 204) return undefined as T;
  if (looksLikeHtml(isJson, text)) {
    throw new ApiError(htmlResponseMessage(), { code: res.status });
  }
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(userFacing('errors.api.invalidJson'), { code: res.status });
  }
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = apiUrl(path);
  ensureApiIsNotFrontOrigin(url);
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: buildRequestHeaders(options),
    });
  } catch (e) {
    rethrowFetchError(e);
  }
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = /application\/(?:[\w.-]+\+)?json/i.test(contentType);
  const text = await res.text();

  if (!res.ok) handleErrorResponse(res, text, isJson);
  return parseSuccessBody<T>(res, text, isJson);
}

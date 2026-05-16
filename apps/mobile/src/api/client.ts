import { getToken } from '@/lib/auth-storage';

const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
export const API_BASE_URL = RAW_BASE.replace(/\/$/, '');
export const API_PREFIX = '/api/v1';

export type ApiErrorPayload = {
  title?: string | null;
  detail?: string | null;
  status?: number | null;
  type?: string | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly payload: ApiErrorPayload | null;

  constructor(status: number, message: string, payload: ApiErrorPayload | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registered once at app boot so the client can react to 401 without circular imports. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip Authorization header even if a token exists (e.g. login/register). */
  noAuth?: boolean;
  /** Override base URL — rare. */
  baseUrl?: string;
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: RequestOptions['query'], baseUrl?: string): string {
  const base = (baseUrl ?? API_BASE_URL).replace(/\/$/, '');
  const prefixed = path.startsWith('/api/') ? path : `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return `${base}${prefixed}`;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs.length ? `${base}${prefixed}?${qs}` : `${base}${prefixed}`;
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    /* no JSON body — fall through */
  }
  const message = payload?.detail ?? payload?.title ?? `HTTP ${response.status}`;
  return new ApiError(response.status, message, payload);
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, noAuth = false, baseUrl, signal } = options;
  const url = buildUrl(path, query, baseUrl);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (!noAuth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
    signal,
  });

  if (response.status === 401 && !noAuth) {
    try {
      unauthorizedHandler?.();
    } catch (err) {
      // Un handler buggué ne doit pas masquer l'ApiError originale qu'on est sur le point de jeter.
      if (__DEV__) console.warn('[client] unauthorizedHandler threw', err);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

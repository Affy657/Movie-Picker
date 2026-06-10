import { ApiError } from '@/shared/api/apiError';

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

export const API_VERSION_PREFIX = '/api/v1';

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE.replace(/\/$/, '');
  if (p.startsWith('/api/') || p === '/health') {
    return `${base}${p}`;
  }
  return `${base}${API_VERSION_PREFIX}${p}`;
}

function ensureApiIsNotFrontOrigin(url: string): void {
  if (globalThis.window === undefined) return;
  try {
    const apiOrigin = new URL(url).origin;
    if (apiOrigin === globalThis.location.origin) {
      throw new ApiError(
        "Configuration incorrecte : l'URL de l'API pointe vers ce site au lieu de l'API. " +
          "Vérifiez le secret VITE_API_URL (doit être l'URL Cloud Run, ex. https://xxx.run.app). " +
          'Puis redéployez le front et faites un rechargement forcé (Ctrl+Shift+R).',
        { code: 0 }
      );
    }
  } catch (e) {
    if (ApiError.is(e) && e.message.startsWith('Configuration incorrecte')) throw e;
  }
}

const NETWORK_ERROR_MSG =
  'Impossible de joindre l’API. Vérifiez que l’API est démarrée (pnpm dev:api-dotnet) et votre connexion.';

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

const HTML_RESPONSE_MSG =
  'L’API a renvoyé du HTML au lieu de JSON. Vérifiez que VITE_API_URL pointe vers l’URL de l’API (ex. Cloud Run), pas vers le site web.';

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
  throw new ApiError(isNetwork ? NETWORK_ERROR_MSG : msg, { code: 0 });
}

function handleErrorResponse(res: Response, text: string, isJson: boolean): never {
  if (looksLikeHtml(isJson, text)) {
    throw new ApiError(HTML_RESPONSE_MSG, { code: res.status });
  }
  let parsed: { error?: string } = { error: res.statusText };
  if (isJson && text.trim()) {
    try {
      parsed = JSON.parse(text) as { error?: string };
    } catch {
      // JSON parse failed — keep the statusText fallback set above
    }
  }
  throw new ApiError(parsed.error ?? `HTTP ${res.status}`, { code: res.status });
}

function parseSuccessBody<T>(res: Response, text: string, isJson: boolean): T {
  if (res.status === 204) return undefined as T;
  if (looksLikeHtml(isJson, text)) {
    throw new ApiError(HTML_RESPONSE_MSG, { code: res.status });
  }
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('Réponse invalide du serveur (JSON attendu).', { code: res.status });
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
  const isJson = contentType.includes('application/json');
  const text = await res.text();

  if (!res.ok) handleErrorResponse(res, text, isJson);
  return parseSuccessBody<T>(res, text, isJson);
}

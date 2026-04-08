import { ApiError } from './apiError';

/**
 * URL de base de l'API (variable d'environnement au build).
 * En dev : VITE_API_URL ou fallback http://localhost:4000
 * Doit être une URL absolue avec protocole (ex. https://xxx.run.app), pas un chemin relatif.
 */
function getApiBase(): string {
  const raw =
    (typeof import.meta.env !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    'http://localhost:4000';
  const base = (typeof raw === 'string' ? raw : '').trim();
  // Si pas de protocole, le navigateur traite comme chemin relatif → requête vers le site au lieu de l'API
  if (base && !/^https?:\/\//i.test(base)) {
    return `https://${base.replace(/^\//, '')}`;
  }
  return base || 'http://localhost:4000';
}

const API_BASE = getApiBase();

/** Préfixe versionné aligné sur l’API .NET (`ApiRoutePrefix.V1`). */
export const API_VERSION_PREFIX = '/api/v1';

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE.replace(/\/$/, '');
  // Chemins déjà versionnés ou hors API métier (tests / intégrations manuelles)
  if (p.startsWith('/api/') || p === '/health') {
    return `${base}${p}`;
  }
  return `${base}${API_VERSION_PREFIX}${p}`;
}

/** Vérifie que l'API ne pointe pas vers le même site (CloudFront) — erreur de config au build. */
function ensureApiIsNotFrontOrigin(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const apiOrigin = new URL(url).origin;
    if (apiOrigin === window.location.origin) {
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

/** Requêtes JSON vers l’API ; `credentials: 'include'` pour la session cookie httpOnly (auth V1). */
export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = apiUrl(path);
  ensureApiIsNotFrontOrigin(url);
  let res: Response;
  try {
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> | undefined),
    };
    if (options?.body != null && options.body !== '') {
      headers['Content-Type'] = 'application/json';
    }
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isNetwork =
      typeof msg === 'string' &&
      (msg.toLowerCase().includes('fetch') ||
        msg.toLowerCase().includes('network') ||
        e instanceof TypeError);
    throw new ApiError(isNetwork ? NETWORK_ERROR_MSG : msg, { code: 0 });
  }
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const text = await res.text();

  if (!res.ok) {
    if (!isJson && text.trimStart().startsWith('<')) {
      throw new ApiError(
        'L’API a renvoyé du HTML au lieu de JSON. Vérifiez que VITE_API_URL pointe vers l’URL de l’API (ex. Cloud Run), pas vers le site web.',
        { code: res.status }
      );
    }
    const err = (isJson ? JSON.parse(text) : { error: res.statusText }) as { error?: string };
    throw new ApiError(err.error ?? `HTTP ${res.status}`, { code: res.status });
  }
  if (res.status === 204) return undefined as T;
  if (!isJson && text.trimStart().startsWith('<')) {
    throw new ApiError(
      'L’API a renvoyé du HTML au lieu de JSON. Vérifiez que VITE_API_URL pointe vers l’URL de l’API (ex. Cloud Run), pas vers le site web.',
      { code: res.status }
    );
  }
  return JSON.parse(text) as Promise<T>;
}

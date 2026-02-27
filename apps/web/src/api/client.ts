/**
 * URL de base de l'API (variable d'environnement au build).
 * En dev : VITE_API_URL ou fallback http://localhost:4000
 */
const API_BASE =
  (typeof import.meta.env !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:4000';

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE.replace(/\/$/, '')}${p}`;
}

const NETWORK_ERROR_MSG =
  'Impossible de joindre l’API. Vérifiez que l’API est démarrée (pnpm dev:api) et votre connexion.';

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = apiUrl(path);
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isNetwork = typeof msg === 'string' && (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network') || e instanceof TypeError);
    throw new Error(isNetwork ? NETWORK_ERROR_MSG : msg);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

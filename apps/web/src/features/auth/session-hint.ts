/**
 * Indice local « l'utilisateur a déjà eu une session ».
 *
 * Objectif : éviter la requête `GET /auth/me` au chargement pour un visiteur
 * anonyme. `fetch()` d'une réponse 401 produit `Failed to load resource: 401`
 * dans la console, que Lighthouse fait remonter sous `errors-in-console`
 * (catégorie Best Practices). L'indice est purement côté client, ne contient
 * aucune donnée utilisateur et n'est pas une source de vérité : le serveur
 * reste maître via le cookie d'auth HttpOnly.
 */
const STORAGE_KEY = 'mp.session-hint';

export function hasSessionHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSessionHint(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearSessionHint(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

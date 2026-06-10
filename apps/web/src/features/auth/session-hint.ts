const STORAGE_KEY = 'mp.session-hint';

export function hasSessionHint(): boolean {
  if (globalThis.window === undefined) return false;
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSessionHint(): void {
  if (globalThis.window === undefined) return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Storage unavailable (private browsing or quota exceeded) — write fails silently
  }
}

export function clearSessionHint(): void {
  if (globalThis.window === undefined) return;
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private browsing or quota exceeded) — remove fails silently
  }
}

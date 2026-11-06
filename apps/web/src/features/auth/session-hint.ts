const STORAGE_KEY = 'mp.session-hint';
const PENDING_SIGN_OUT_KEY = 'mp.sign-out-pending';

type MemoryHint = 'unknown' | 'present' | 'absent';

let memoryHint: MemoryHint = 'unknown';
let memorySignOutPending = false;

function readStoredHint(): { readable: boolean; value: boolean } {
  try {
    return { readable: true, value: globalThis.localStorage.getItem(STORAGE_KEY) === '1' };
  } catch {
    return { readable: false, value: false };
  }
}

export function hasSessionHint(): boolean {
  if (globalThis.window === undefined) return false;
  if (memoryHint === 'present') return true;
  const stored = readStoredHint();
  if (stored.readable) return stored.value;
  return memoryHint !== 'absent';
}

export function setSessionHint(): void {
  if (globalThis.window === undefined) return;
  memoryHint = 'present';
  clearPendingSignOut();
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, '1');
  } catch {}
}

export function clearSessionHint(): void {
  if (globalThis.window === undefined) return;
  memoryHint = 'absent';
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function hasPendingSignOut(): boolean {
  if (globalThis.window === undefined) return false;
  if (memorySignOutPending) return true;
  try {
    return globalThis.localStorage.getItem(PENDING_SIGN_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSignOutPending(): void {
  memorySignOutPending = true;
  try {
    globalThis.localStorage.setItem(PENDING_SIGN_OUT_KEY, '1');
  } catch {}
}

export function clearPendingSignOut(): void {
  memorySignOutPending = false;
  try {
    globalThis.localStorage.removeItem(PENDING_SIGN_OUT_KEY);
  } catch {}
}

export function onSessionChangedInAnotherTab(listener: () => void): () => void {
  const handleStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== STORAGE_KEY && event.key !== PENDING_SIGN_OUT_KEY) {
      return;
    }
    memoryHint = 'unknown';
    memorySignOutPending = false;
    listener();
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

export function resetSessionHintMemoryForTests(): void {
  memoryHint = 'unknown';
  memorySignOutPending = false;
}

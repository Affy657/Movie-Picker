const STORAGE_KEY = 'mp.session-hint';

type MemoryHint = 'unknown' | 'present' | 'absent';

let memoryHint: MemoryHint = 'unknown';

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

export function resetSessionHintMemoryForTests(): void {
  memoryHint = 'unknown';
}

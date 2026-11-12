import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation } from 'react-router';

const STORAGE_PREFIX = 'mp.history-entry:';
const ROUTER_FIRST_ENTRY_KEY = 'default';

let firstEntryOfPreviousDocumentCleared = false;

function storageKey(entryKey: string, name: string): string {
  return `${STORAGE_PREFIX}${entryKey}:${name}`;
}

function isFreshDocumentNavigation(): boolean {
  try {
    const [navigation] = performance.getEntriesByType('navigation');
    return (navigation as PerformanceNavigationTiming | undefined)?.type === 'navigate';
  } catch {
    return false;
  }
}

function clearFirstEntryOfPreviousDocumentOnce(): void {
  if (firstEntryOfPreviousDocumentCleared) return;
  firstEntryOfPreviousDocumentCleared = true;
  if (!isFreshDocumentNavigation()) return;
  const firstEntryPrefix = storageKey(ROUTER_FIRST_ENTRY_KEY, '');
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(firstEntryPrefix)) sessionStorage.removeItem(key);
  }
}

export function readHistoryEntryValue(entryKey: string, name: string): unknown {
  try {
    clearFirstEntryOfPreviousDocumentOnce();
    const raw = sessionStorage.getItem(storageKey(entryKey, name));
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

export function writeHistoryEntryValue(entryKey: string, name: string, value: unknown): void {
  try {
    clearFirstEntryOfPreviousDocumentOnce();
    sessionStorage.setItem(storageKey(entryKey, name), JSON.stringify(value));
  } catch {
    return;
  }
}

function hasShapeOf(reference: unknown, value: unknown): boolean {
  if (reference === undefined) return true;
  if (reference === null) return value === null;
  if (Array.isArray(reference)) return Array.isArray(value);
  if (value === null || typeof value !== typeof reference) return false;
  if (typeof reference !== 'object') return true;
  const fields = value as Record<string, unknown>;
  return Object.entries(reference).every(([field, fieldReference]) =>
    hasShapeOf(fieldReference, fields[field])
  );
}

export function useHistoryEntryState<T>(
  name: string,
  initialValue: T,
  isValid: (value: unknown) => value is T = (value): value is T => hasShapeOf(initialValue, value)
): [T, Dispatch<SetStateAction<T>>] {
  const { key } = useLocation();
  const [value, setValue] = useState<T>(() => {
    const stored = readHistoryEntryValue(key, name);
    return stored !== undefined && isValid(stored) ? stored : initialValue;
  });

  useEffect(() => {
    writeHistoryEntryValue(key, name, value);
  }, [key, name, value]);

  return [value, setValue];
}

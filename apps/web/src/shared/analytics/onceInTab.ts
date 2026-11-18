const TAB_STORAGE_KEY = 'mp.analytics-once';
const MAX_REMEMBERED_KEYS = 200;

let seenInPage = new Set<string>();

function readTabKeys(): string[] {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((key): key is string => typeof key === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeTabKeys(keys: string[]): void {
  try {
    sessionStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(keys.slice(-MAX_REMEMBERED_KEYS)));
  } catch {
    return;
  }
}

export function firstTimeInTab(key: string): boolean {
  if (seenInPage.has(key)) return false;
  seenInPage.add(key);
  const tabKeys = readTabKeys();
  if (tabKeys.includes(key)) return false;
  writeTabKeys([...tabKeys, key]);
  return true;
}

export function resetOnceInTabForTests(options: { keepTabStorage?: boolean } = {}): void {
  seenInPage = new Set<string>();
  if (options.keepTabStorage) return;
  try {
    sessionStorage.removeItem(TAB_STORAGE_KEY);
  } catch {
    return;
  }
}

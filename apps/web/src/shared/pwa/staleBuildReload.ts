import { safeSessionStorageGet, safeSessionStorageSet } from '@/shared/utils/safeStorage';

export const STALE_BUILD_RELOAD_KEY = 'moviepicker_stale_build_reload_at';
const RELOAD_COOLDOWN_MS = 30_000;

function reloadedRecently(now: number): boolean {
  const last = Number(safeSessionStorageGet(STALE_BUILD_RELOAD_KEY));
  return last > 0 && now - last < RELOAD_COOLDOWN_MS;
}

export function reloadOnStaleBuild(
  page: EventTarget = window,
  reload: () => void = () => window.location.reload(),
  now: () => number = Date.now,
  isOnline: () => boolean = () => navigator.onLine
): void {
  page.addEventListener('vite:preloadError', () => {
    const at = now();
    if (!isOnline() || reloadedRecently(at)) return;
    if (!safeSessionStorageSet(STALE_BUILD_RELOAD_KEY, String(at))) return;
    reload();
  });
}

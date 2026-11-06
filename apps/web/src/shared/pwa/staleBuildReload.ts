import { safeSessionStorageGet, safeSessionStorageSet } from '@/shared/utils/safeStorage';

export const STALE_BUILD_RELOAD_KEY = 'moviepicker_stale_build_reload_at';
const RELOAD_COOLDOWN_MS = 30_000;
const CHUNK_LOAD_FAILURE =
  /dynamically imported module|importing a module script failed|unable to preload css/i;

export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_LOAD_FAILURE.test(error.message);
}

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

export function reloadForFreshBuild(
  reload: () => void = () => window.location.reload(),
  now: () => number = Date.now
): void {
  safeSessionStorageSet(STALE_BUILD_RELOAD_KEY, String(now()));
  reload();
}

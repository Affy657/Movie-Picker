import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STALE_BUILD_RELOAD_KEY, reloadOnStaleBuild } from '@/shared/pwa/staleBuildReload';

function failChunkLoad(page: EventTarget): void {
  page.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
}

describe('reloadOnStaleBuild', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('reloads the page when a chunk of the previous build is gone', () => {
    const page = new EventTarget();
    const reload = vi.fn();
    reloadOnStaleBuild(page, reload, () => 1_000_000);

    failChunkLoad(page);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(STALE_BUILD_RELOAD_KEY)).toBe('1000000');
  });

  it('lets the error surface right after such a reload instead of looping', () => {
    const reload = vi.fn();
    const before = new EventTarget();
    reloadOnStaleBuild(before, reload, () => 1_000_000);
    failChunkLoad(before);

    const after = new EventTarget();
    reloadOnStaleBuild(after, reload, () => 1_005_000);
    failChunkLoad(after);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads again once the previous reload is old enough', () => {
    const reload = vi.fn();
    const before = new EventTarget();
    reloadOnStaleBuild(before, reload, () => 1_000_000);
    failChunkLoad(before);

    const later = new EventTarget();
    reloadOnStaleBuild(later, reload, () => 1_000_000 + 60_000);
    failChunkLoad(later);

    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('lets the error surface when the tab storage cannot keep the guard', () => {
    const page = new EventTarget();
    const reload = vi.fn();
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    try {
      reloadOnStaleBuild(page, reload, () => 1_000_000);
      failChunkLoad(page);
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }

    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload while the device is offline', () => {
    const page = new EventTarget();
    const reload = vi.fn();
    reloadOnStaleBuild(
      page,
      reload,
      () => 1_000_000,
      () => false
    );

    failChunkLoad(page);

    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(STALE_BUILD_RELOAD_KEY)).toBeNull();
  });
});

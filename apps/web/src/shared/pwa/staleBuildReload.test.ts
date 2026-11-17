import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  STALE_BUILD_RELOAD_KEY,
  isChunkLoadError,
  reloadForFreshBuild,
  reloadIfStaleBuild,
} from '@/shared/pwa/staleBuildReload';

const MISSING_CHUNK = new TypeError(
  'Failed to fetch dynamically imported module: https://x/assets/Gone.js'
);

describe('reloadIfStaleBuild', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('reloads the page when a chunk of the previous build is gone', () => {
    const reload = vi.fn();

    expect(reloadIfStaleBuild(MISSING_CHUNK, reload, () => 1_000_000)).toBe(true);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(STALE_BUILD_RELOAD_KEY)).toBe('1000000');
  });

  it('leaves any other error to the error screen', () => {
    const reload = vi.fn();

    expect(reloadIfStaleBuild(new Error('Cannot read properties of undefined'), reload)).toBe(
      false
    );

    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(STALE_BUILD_RELOAD_KEY)).toBeNull();
  });

  it('lets the error surface right after such a reload instead of looping', () => {
    const reload = vi.fn();
    reloadIfStaleBuild(MISSING_CHUNK, reload, () => 1_000_000);

    expect(reloadIfStaleBuild(MISSING_CHUNK, reload, () => 1_005_000)).toBe(false);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads again once the previous reload is old enough', () => {
    const reload = vi.fn();
    reloadIfStaleBuild(MISSING_CHUNK, reload, () => 1_000_000);

    reloadIfStaleBuild(MISSING_CHUNK, reload, () => 1_000_000 + 60_000);

    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('lets the error surface when the tab storage cannot keep the guard', () => {
    const reload = vi.fn();
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    try {
      expect(reloadIfStaleBuild(MISSING_CHUNK, reload, () => 1_000_000)).toBe(false);
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }

    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload while the device is offline', () => {
    const reload = vi.fn();

    reloadIfStaleBuild(
      MISSING_CHUNK,
      reload,
      () => 1_000_000,
      () => false
    );

    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(STALE_BUILD_RELOAD_KEY)).toBeNull();
  });
});

describe('isChunkLoadError', () => {
  it.each([
    ['Chrome', 'Failed to fetch dynamically imported module: https://x/assets/a.js'],
    ['Firefox', 'error loading dynamically imported module: https://x/assets/a.js'],
    ['Safari', 'Importing a module script failed.'],
    ['the Vite preload', 'Unable to preload CSS for /assets/a.css'],
  ])('recognises the wording of %s', (_engine, message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('leaves the other errors to the usual retry', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('reloadForFreshBuild', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('reloads and arms the guard, so the automatic reload does not chain on it', () => {
    const reload = vi.fn();
    reloadForFreshBuild(reload, () => 1_000_000);

    reloadIfStaleBuild(MISSING_CHUNK, reload, () => 1_005_000);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads even when the tab storage cannot keep the guard, a click cannot loop', () => {
    const reload = vi.fn();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('storage indisponible');
    });

    reloadForFreshBuild(reload);

    expect(reload).toHaveBeenCalledTimes(1);
  });
});

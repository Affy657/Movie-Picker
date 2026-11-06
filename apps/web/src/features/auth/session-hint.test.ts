import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearPendingSignOut,
  clearSessionHint,
  hasPendingSignOut,
  hasSessionHint,
  markSignOutPending,
  onSessionChangedInAnotherTab,
  resetSessionHintMemoryForTests,
  setSessionHint,
} from '@/features/auth/session-hint';

const STORAGE_KEY = 'mp.session-hint';

describe('session hint', () => {
  beforeEach(() => {
    resetSessionHintMemoryForTests();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetSessionHintMemoryForTests();
    localStorage.clear();
  });

  it('reflects the stored value when the storage is readable', () => {
    expect(hasSessionHint()).toBe(false);
    setSessionHint();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
    expect(hasSessionHint()).toBe(true);
    clearSessionHint();
    expect(hasSessionHint()).toBe(false);
  });

  it('does not conclude to a missing session when the storage is unreadable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage indisponible');
    });
    expect(hasSessionHint()).toBe(true);
  });

  it('keeps the session in memory when the storage refuses writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage indisponible');
    });
    setSessionHint();
    expect(hasSessionHint()).toBe(true);
  });

  it('stays false after sign-out even when the storage is unreadable', () => {
    clearSessionHint();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage indisponible');
    });
    expect(hasSessionHint()).toBe(false);
  });
});

describe('pending sign-out', () => {
  beforeEach(() => {
    resetSessionHintMemoryForTests();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetSessionHintMemoryForTests();
    localStorage.clear();
  });

  it('survives a reload', () => {
    markSignOutPending();
    resetSessionHintMemoryForTests();
    expect(hasPendingSignOut()).toBe(true);
    clearPendingSignOut();
    expect(hasPendingSignOut()).toBe(false);
  });

  it('holds in this page when the storage refuses writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage indisponible');
    });
    markSignOutPending();
    expect(hasPendingSignOut()).toBe(true);
  });

  it('is dropped by a new sign-in, which a replay must not end', () => {
    markSignOutPending();
    setSessionHint();
    expect(hasPendingSignOut()).toBe(false);
  });
});

describe('session changes in another tab', () => {
  beforeEach(() => {
    resetSessionHintMemoryForTests();
    localStorage.clear();
  });

  afterEach(() => {
    resetSessionHintMemoryForTests();
    localStorage.clear();
  });

  function storageChange(key: string | null): void {
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }

  it('reads the hint again once another tab removed it', () => {
    setSessionHint();
    const onChange = vi.fn();
    const stop = onSessionChangedInAnotherTab(onChange);

    localStorage.removeItem(STORAGE_KEY);
    storageChange(STORAGE_KEY);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(hasSessionHint()).toBe(false);
    stop();
  });

  it('hears a pending sign-out set elsewhere, and a storage wiped as a whole', () => {
    const onChange = vi.fn();
    const stop = onSessionChangedInAnotherTab(onChange);

    storageChange('mp.sign-out-pending');
    storageChange(null);

    expect(onChange).toHaveBeenCalledTimes(2);
    stop();
  });

  it('ignores the other keys, and stops listening once told to', () => {
    const onChange = vi.fn();
    const stop = onSessionChangedInAnotherTab(onChange);

    storageChange('moviepicker-locale');
    stop();
    storageChange(STORAGE_KEY);

    expect(onChange).not.toHaveBeenCalled();
  });
});

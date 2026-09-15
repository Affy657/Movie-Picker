import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearSessionHint,
  hasSessionHint,
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

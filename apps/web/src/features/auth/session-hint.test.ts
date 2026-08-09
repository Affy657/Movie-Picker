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

  it('reflète la valeur stockée quand le storage est lisible', () => {
    expect(hasSessionHint()).toBe(false);
    setSessionHint();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
    expect(hasSessionHint()).toBe(true);
    clearSessionHint();
    expect(hasSessionHint()).toBe(false);
  });

  it('ne conclut pas à une absence de session quand le storage est illisible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage indisponible');
    });
    expect(hasSessionHint()).toBe(true);
  });

  it('garde la session en mémoire quand le storage refuse les écritures', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage indisponible');
    });
    setSessionHint();
    expect(hasSessionHint()).toBe(true);
  });

  it('reste à faux après déconnexion même si le storage est illisible', () => {
    clearSessionHint();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage indisponible');
    });
    expect(hasSessionHint()).toBe(false);
  });
});

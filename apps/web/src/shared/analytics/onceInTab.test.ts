import { afterEach, describe, expect, it, vi } from 'vitest';
import { firstTimeInTab, resetOnceInTabForTests } from '@/shared/analytics/onceInTab';

describe('firstTimeInTab', () => {
  afterEach(() => {
    resetOnceInTabForTests();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('answers true the first time only', () => {
    expect(firstTimeInTab('event_link_opened:abc')).toBe(true);
    expect(firstTimeInTab('event_link_opened:abc')).toBe(false);
    expect(firstTimeInTab('event_link_opened:other')).toBe(true);
  });

  it('remembers across a reload of the page in the same tab', () => {
    expect(firstTimeInTab('recap_viewed:r1')).toBe(true);

    resetOnceInTabForTests({ keepTabStorage: true });

    expect(firstTimeInTab('recap_viewed:r1')).toBe(false);
  });

  it('still answers once per page when the tab storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(firstTimeInTab('event_link_opened:abc')).toBe(true);
    expect(firstTimeInTab('event_link_opened:abc')).toBe(false);
  });

  it('keeps only the most recent keys so the tab storage stays small', () => {
    for (let index = 0; index < 250; index += 1) firstTimeInTab(`key:${index}`);

    resetOnceInTabForTests({ keepTabStorage: true });

    expect(firstTimeInTab('key:249')).toBe(false);
    expect(firstTimeInTab('key:0')).toBe(true);
  });
});

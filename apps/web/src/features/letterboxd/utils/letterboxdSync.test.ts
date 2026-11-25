import { describe, expect, it } from 'vitest';
import { buildUserProfile } from '@/test-utils/userProfile';
import { letterboxdSyncEnabled, syncsWithLetterboxd } from './letterboxdSync';

describe('letterboxdSync', () => {
  it('syncs both lists by default, as an account saved before the switches existed', () => {
    const user = buildUserProfile({ letterboxdUsername: 'alice_lb' });

    expect(syncsWithLetterboxd(user, 'watchlist')).toBe(true);
    expect(syncsWithLetterboxd(user, 'watched')).toBe(true);
  });

  it('follows each switch on its own', () => {
    const user = buildUserProfile({
      letterboxdUsername: 'alice_lb',
      letterboxdSyncWatchlist: false,
      letterboxdSyncWatched: true,
    });

    expect(syncsWithLetterboxd(user, 'watchlist')).toBe(false);
    expect(syncsWithLetterboxd(user, 'watched')).toBe(true);
  });

  it('syncs nothing without a Letterboxd username, whatever the switches say', () => {
    const user = buildUserProfile({ letterboxdUsername: null });

    expect(letterboxdSyncEnabled(user, 'watched')).toBe(true);
    expect(syncsWithLetterboxd(user, 'watched')).toBe(false);
    expect(syncsWithLetterboxd(null, 'watchlist')).toBe(false);
  });
});

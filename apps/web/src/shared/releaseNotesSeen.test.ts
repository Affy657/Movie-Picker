import { afterEach, describe, expect, it } from 'vitest';
import { hasUnseenReleaseNotes, markReleaseNotesSeen } from './releaseNotesSeen';

const KEY = 'mp.release-notes-seen';

describe('releaseNotesSeen', () => {
  afterEach(() => localStorage.clear());

  it('starts a first visit as up to date instead of flagging the whole history', () => {
    expect(hasUnseenReleaseNotes('1.8.0')).toBe(false);
    expect(localStorage.getItem(KEY)).toBe('1.8.0');
  });

  it('flags a new minor version, which is what brings new features', () => {
    localStorage.setItem(KEY, '1.7.2');
    expect(hasUnseenReleaseNotes('1.8.0')).toBe(true);
  });

  it('ignores a patch release', () => {
    localStorage.setItem(KEY, '1.8.0');
    expect(hasUnseenReleaseNotes('1.8.3')).toBe(false);
  });

  it('clears the flag once the release notes have been read', () => {
    localStorage.setItem(KEY, '1.7.2');
    markReleaseNotesSeen('1.8.0');
    expect(hasUnseenReleaseNotes('1.8.0')).toBe(false);
  });
});

import { APP_VERSION } from '@/shared/appVersion';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/shared/utils/safeStorage';

const STORAGE_KEY = 'mp.release-notes-seen';

function featureVersion(version: string): string {
  return version.split('.').slice(0, 2).join('.');
}

export function hasUnseenReleaseNotes(currentVersion: string = APP_VERSION): boolean {
  const seen = safeLocalStorageGet(STORAGE_KEY);
  if (seen === null) {
    safeLocalStorageSet(STORAGE_KEY, currentVersion);
    return false;
  }
  return featureVersion(seen) !== featureVersion(currentVersion);
}

export function markReleaseNotesSeen(currentVersion: string = APP_VERSION): void {
  safeLocalStorageSet(STORAGE_KEY, currentVersion);
}

import {
  safeSessionStorageGet,
  safeSessionStorageRemove,
  safeSessionStorageSet,
} from '@/shared/utils/safeStorage';

const WELCOME_KEY = 'mp.welcome-pending';

export function markWelcomePending(): void {
  safeSessionStorageSet(WELCOME_KEY, '1');
}

export function takeWelcomePending(): boolean {
  const pending = safeSessionStorageGet(WELCOME_KEY) === '1';
  if (pending) safeSessionStorageRemove(WELCOME_KEY);
  return pending;
}

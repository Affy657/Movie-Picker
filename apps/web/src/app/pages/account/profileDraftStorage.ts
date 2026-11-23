import {
  safeSessionStorageGet,
  safeSessionStorageRemove,
  safeSessionStorageSet,
} from '@/shared/utils/safeStorage';

const PROFILE_DRAFT_KEY = 'mp.profile-draft';

export type ProfileTextDraft = { displayName: string; bio: string };

type StoredProfileDraft = ProfileTextDraft & { userId: string };

function isStoredProfileDraft(value: unknown): value is StoredProfileDraft {
  if (value === null || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.userId === 'string' &&
    typeof draft.displayName === 'string' &&
    typeof draft.bio === 'string'
  );
}

export function readProfileDraft(userId: string): ProfileTextDraft | null {
  const raw = safeSessionStorageGet(PROFILE_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredProfileDraft(parsed) || parsed.userId !== userId) return null;
    return { displayName: parsed.displayName, bio: parsed.bio };
  } catch {
    return null;
  }
}

export function keepProfileDraft(userId: string, draft: ProfileTextDraft): void {
  const stored: StoredProfileDraft = { userId, displayName: draft.displayName, bio: draft.bio };
  safeSessionStorageSet(PROFILE_DRAFT_KEY, JSON.stringify(stored));
}

export function forgetProfileDraft(): void {
  safeSessionStorageRemove(PROFILE_DRAFT_KEY);
}

import { clearOfflineEventData } from '@/shared/utils/offlineEventStorage';

const PARTICIPANT_KEY = 'moviepicker_participant_';

export function getStoredParticipant(
  slug: string
): { participantId: string; pseudo: string } | null {
  try {
    const raw = sessionStorage.getItem(PARTICIPANT_KEY + slug);
    if (!raw) return null;
    const data = JSON.parse(raw) as { participantId: string; pseudo: string };
    return data.participantId && data.pseudo ? data : null;
  } catch {
    return null;
  }
}

export function setStoredParticipant(slug: string, participantId: string, pseudo: string): void {
  try {
    sessionStorage.setItem(PARTICIPANT_KEY + slug, JSON.stringify({ participantId, pseudo }));
  } catch {}
}

export function removeStoredParticipant(slug: string): void {
  try {
    sessionStorage.removeItem(PARTICIPANT_KEY + slug);
  } catch {}
}

export function clearStoredEventIdentities(): void {
  clearOfflineEventData();
  try {
    const identityKeys: string[] = [];
    for (let index = 0; index < sessionStorage.length; index++) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(PARTICIPANT_KEY)) identityKeys.push(key);
    }
    for (const key of identityKeys) sessionStorage.removeItem(key);
  } catch {}
}

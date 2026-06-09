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
  } catch {
    // Storage unavailable (private browsing or quota exceeded) — write fails silently
  }
}

export function removeStoredParticipant(slug: string): void {
  try {
    sessionStorage.removeItem(PARTICIPANT_KEY + slug);
  } catch {
    // Storage unavailable (private browsing or quota exceeded) — remove fails silently
  }
}

const HOST_KEY = 'moviepicker_host_';

export function getStoredHostToken(slug: string): string | null {
  try {
    return sessionStorage.getItem(HOST_KEY + slug);
  } catch {
    return null;
  }
}

export function setStoredHostToken(slug: string, token: string): void {
  try {
    sessionStorage.setItem(HOST_KEY + slug, token);
  } catch {
    // Storage unavailable (private browsing or quota exceeded) — write fails silently
  }
}

export function clearStoredHostToken(slug: string): void {
  try {
    sessionStorage.removeItem(HOST_KEY + slug);
  } catch {
    // Storage unavailable (private browsing or quota exceeded) — remove fails silently
  }
}

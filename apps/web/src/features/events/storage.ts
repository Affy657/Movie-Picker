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
    // Navigation privée ou quota dépassé — non bloquant.
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
    // Navigation privée ou quota dépassé — non bloquant.
  }
}

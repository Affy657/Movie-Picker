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

/** Slugs pour lesquels une session invité a été enregistrée (page « Mes soirées » sans compte). */
export function listStoredParticipantSlugs(): string[] {
  if (typeof sessionStorage === 'undefined') return [];
  const out: string[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k?.startsWith(PARTICIPANT_KEY)) continue;
      const slug = k.slice(PARTICIPANT_KEY.length);
      if (slug && getStoredParticipant(slug)) out.push(slug);
    }
  } catch {
    return out;
  }
  return [...new Set(out)];
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

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'mp-guest-participant-';

export type GuestParticipant = { participantId: string; pseudo: string };

export async function getGuestParticipant(slug: string): Promise<GuestParticipant | null> {
  try {
    const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.participantId === 'string' && typeof parsed?.pseudo === 'string') {
      return parsed as GuestParticipant;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setGuestParticipant(
  slug: string,
  participant: GuestParticipant
): Promise<void> {
  await AsyncStorage.setItem(`${KEY_PREFIX}${slug}`, JSON.stringify(participant));
}

export async function clearGuestParticipant(slug: string): Promise<void> {
  await AsyncStorage.removeItem(`${KEY_PREFIX}${slug}`);
}

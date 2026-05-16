import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearGuestParticipant, getGuestParticipant, setGuestParticipant } from './guest-storage';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __reset: () => store.clear(),
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      store.delete(k);
    }),
  };
});

beforeEach(() => {
  (AsyncStorage as unknown as { __reset(): void }).__reset();
});

describe('guest-storage', () => {
  it('returns null when no participant is stored', async () => {
    expect(await getGuestParticipant('soiree')).toBeNull();
  });

  it('persists and reads a participant', async () => {
    await setGuestParticipant('soiree', { participantId: 'p1', pseudo: 'Léa' });
    expect(await getGuestParticipant('soiree')).toEqual({ participantId: 'p1', pseudo: 'Léa' });
  });

  it('clears a participant', async () => {
    await setGuestParticipant('soiree', { participantId: 'p1', pseudo: 'Léa' });
    await clearGuestParticipant('soiree');
    expect(await getGuestParticipant('soiree')).toBeNull();
  });

  it('returns null when the stored value is malformed', async () => {
    await AsyncStorage.setItem('mp-guest-participant-soiree', '{"foo":42}');
    expect(await getGuestParticipant('soiree')).toBeNull();
  });
});

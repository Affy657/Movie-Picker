import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearStoredEventIdentities,
  getStoredParticipant,
  setStoredParticipant,
} from '@/shared/utils/eventIdentityStorage';

describe('event storage', () => {
  const slug = 'test-slug';

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  describe('getStoredParticipant / setStoredParticipant', () => {
    it('getStoredParticipant retourne null si vide', () => {
      (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
      expect(getStoredParticipant(slug)).toBeNull();
    });
    it('getStoredParticipant returns the valid data', () => {
      (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({ participantId: 'p1', pseudo: 'Alice' })
      );
      expect(getStoredParticipant(slug)).toEqual({ participantId: 'p1', pseudo: 'Alice' });
    });
    it('getStoredParticipant returns null when the data is invalid', () => {
      (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('{}');
      expect(getStoredParticipant(slug)).toBeNull();
    });
    it('setStoredParticipant appelle setItem', () => {
      setStoredParticipant(slug, 'p1', 'Alice');
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'moviepicker_participant_' + slug,
        JSON.stringify({ participantId: 'p1', pseudo: 'Alice' })
      );
    });
  });

  describe('clearStoredEventIdentities', () => {
    it('removes every participant identity, nothing else', () => {
      const keys = [
        'moviepicker_participant_abc',
        'moviepicker_participant_xyz',
        'moviepicker-consent',
      ];
      Object.assign(sessionStorage, { length: keys.length });
      (sessionStorage.key as ReturnType<typeof vi.fn>).mockImplementation(
        (index: number) => keys[index] ?? null
      );

      clearStoredEventIdentities();

      expect(sessionStorage.removeItem).toHaveBeenCalledTimes(2);
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('moviepicker_participant_abc');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('moviepicker_participant_xyz');
      expect(sessionStorage.removeItem).not.toHaveBeenCalledWith('moviepicker-consent');
    });

    it('does not throw when sessionStorage is unreachable', () => {
      vi.stubGlobal('sessionStorage', undefined);
      expect(() => clearStoredEventIdentities()).not.toThrow();
    });
  });
});

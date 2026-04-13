import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredHostToken,
  setStoredHostToken,
  getStoredParticipant,
  setStoredParticipant,
  listStoredParticipantSlugs,
} from '@/features/events/storage';

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

  describe('getStoredHostToken / setStoredHostToken', () => {
    it('getStoredHostToken retourne null si vide', () => {
      (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
      expect(getStoredHostToken(slug)).toBeNull();
    });
    it('getStoredHostToken retourne la valeur stockée', () => {
      (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('my-token');
      expect(getStoredHostToken(slug)).toBe('my-token');
    });
    it('setStoredHostToken appelle setItem avec la clé et la valeur', () => {
      setStoredHostToken(slug, 'token123');
      expect(sessionStorage.setItem).toHaveBeenCalledWith('moviepicker_host_' + slug, 'token123');
    });
  });

  describe('getStoredParticipant / setStoredParticipant', () => {
    it('getStoredParticipant retourne null si vide', () => {
      (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
      expect(getStoredParticipant(slug)).toBeNull();
    });
    it('getStoredParticipant retourne les données valides', () => {
      (sessionStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({ participantId: 'p1', pseudo: 'Alice' })
      );
      expect(getStoredParticipant(slug)).toEqual({ participantId: 'p1', pseudo: 'Alice' });
    });
    it('getStoredParticipant retourne null si données invalides', () => {
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

  describe('listStoredParticipantSlugs', () => {
    it('retourne les slugs avec participant valide', () => {
      const store: Record<string, string> = {
        moviepicker_participant_alpha: JSON.stringify({ participantId: 'p1', pseudo: 'A' }),
        moviepicker_participant_beta: JSON.stringify({ participantId: 'p2', pseudo: 'B' }),
        other_key: 'x',
      };
      const keys = Object.keys(store);
      vi.stubGlobal('sessionStorage', {
        get length() {
          return keys.length;
        },
        key: (i: number) => keys[i] ?? null,
        getItem: (k: string) => store[k] ?? null,
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      });
      expect(listStoredParticipantSlugs().sort()).toEqual(['alpha', 'beta']);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchHistory } from './useSearchHistory';

const USER_ID = 'user-123';
const KEY = `moviepicker_search_history_${USER_ID}`;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useSearchHistory', () => {
  it('retourne un historique vide si aucune donnée en localStorage', () => {
    const { result } = renderHook(() => useSearchHistory(USER_ID));
    expect(result.current.history).toEqual([]);
  });

  it("charge l'historique existant au montage", () => {
    localStorage.setItem(KEY, JSON.stringify(['matrix', 'inception']));
    const { result } = renderHook(() => useSearchHistory(USER_ID));
    expect(result.current.history).toEqual(['matrix', 'inception']);
  });

  it('retourne un historique vide si localStorage contient du JSON invalide', () => {
    localStorage.setItem(KEY, 'not-json{{{');
    const { result } = renderHook(() => useSearchHistory(USER_ID));
    expect(result.current.history).toEqual([]);
  });

  it('retourne un historique vide si localStorage contient une valeur non-tableau', () => {
    localStorage.setItem(KEY, JSON.stringify({ foo: 'bar' }));
    const { result } = renderHook(() => useSearchHistory(USER_ID));
    expect(result.current.history).toEqual([]);
  });

  it('retourne un historique vide si userId est undefined', () => {
    localStorage.setItem(KEY, JSON.stringify(['matrix']));
    const { result } = renderHook(() => useSearchHistory(undefined));
    expect(result.current.history).toEqual([]);
  });

  it("recharge l'historique quand userId change", () => {
    localStorage.setItem(KEY, JSON.stringify(['matrix']));
    localStorage.setItem('moviepicker_search_history_user-456', JSON.stringify(['avatar']));
    const { result, rerender } = renderHook(({ uid }) => useSearchHistory(uid), {
      initialProps: { uid: USER_ID as string | undefined },
    });
    expect(result.current.history).toEqual(['matrix']);
    rerender({ uid: 'user-456' });
    expect(result.current.history).toEqual(['avatar']);
  });

  it("vide l'historique quand userId passe a undefined", () => {
    localStorage.setItem(KEY, JSON.stringify(['matrix']));
    const { result, rerender } = renderHook(({ uid }) => useSearchHistory(uid), {
      initialProps: { uid: USER_ID as string | undefined },
    });
    expect(result.current.history).toEqual(['matrix']);
    rerender({ uid: undefined });
    expect(result.current.history).toEqual([]);
  });

  describe('addToHistory', () => {
    it('ajoute une entrée et la persiste', () => {
      const { result } = renderHook(() => useSearchHistory(USER_ID));
      act(() => result.current.addToHistory('inception'));
      expect(result.current.history).toEqual(['inception']);
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['inception']);
    });

    it("met l'entree en tete si elle existe deja (dedup)", () => {
      localStorage.setItem(KEY, JSON.stringify(['inception', 'matrix']));
      const { result } = renderHook(() => useSearchHistory(USER_ID));
      act(() => result.current.addToHistory('matrix'));
      expect(result.current.history).toEqual(['matrix', 'inception']);
    });

    it('ignore les requêtes vides ou uniquement des espaces', () => {
      const { result } = renderHook(() => useSearchHistory(USER_ID));
      act(() => result.current.addToHistory('   '));
      expect(result.current.history).toEqual([]);
    });

    it('ne fait rien si userId est undefined', () => {
      const { result } = renderHook(() => useSearchHistory(undefined));
      act(() => result.current.addToHistory('inception'));
      expect(result.current.history).toEqual([]);
    });

    it('respecte la limite de 5 entrées', () => {
      localStorage.setItem(KEY, JSON.stringify(['a', 'b', 'c', 'd', 'e']));
      const { result } = renderHook(() => useSearchHistory(USER_ID));
      act(() => result.current.addToHistory('f'));
      expect(result.current.history).toEqual(['f', 'a', 'b', 'c', 'd']);
      expect(result.current.history).toHaveLength(5);
    });
  });

  describe('removeFromHistory', () => {
    it('supprime une entrée spécifique', () => {
      localStorage.setItem(KEY, JSON.stringify(['inception', 'matrix', 'avatar']));
      const { result } = renderHook(() => useSearchHistory(USER_ID));
      act(() => result.current.removeFromHistory('matrix'));
      expect(result.current.history).toEqual(['inception', 'avatar']);
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['inception', 'avatar']);
    });

    it('ne fait rien si userId est undefined', () => {
      const { result } = renderHook(() => useSearchHistory(undefined));
      act(() => result.current.removeFromHistory('inception'));
      expect(result.current.history).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it("vide tout l'historique", () => {
      localStorage.setItem(KEY, JSON.stringify(['inception', 'matrix']));
      const { result } = renderHook(() => useSearchHistory(USER_ID));
      act(() => result.current.clearHistory());
      expect(result.current.history).toEqual([]);
      expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([]);
    });

    it('ne fait rien si userId est undefined', () => {
      const { result } = renderHook(() => useSearchHistory(undefined));
      act(() => result.current.clearHistory());
      expect(result.current.history).toEqual([]);
    });
  });

  it('ne plante pas si localStorage.setItem lève une erreur', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useSearchHistory(USER_ID));
    expect(() => act(() => result.current.addToHistory('inception'))).not.toThrow();
  });
});

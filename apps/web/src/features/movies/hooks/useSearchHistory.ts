import { useCallback, useEffect, useState } from 'react';

const MAX_HISTORY = 5;

function storageKey(userId: string) {
  return `moviepicker_search_history_${userId}`;
}

function readHistory(userId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(userId: string, history: string[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(history));
  } catch {
    return;
  }
}

export function useSearchHistory(userId: string | undefined) {
  const [history, setHistory] = useState<string[]>(() => (userId ? readHistory(userId) : []));

  useEffect(() => {
    if (userId) {
      setHistory(readHistory(userId));
    } else {
      setHistory([]);
    }
  }, [userId]);

  const addToHistory = useCallback(
    (query: string) => {
      if (!userId) return;
      const trimmed = query.trim();
      if (!trimmed) return;
      setHistory((prev) => {
        const deduped = prev.filter((q) => q !== trimmed);
        const next = [trimmed, ...deduped].slice(0, MAX_HISTORY);
        writeHistory(userId, next);
        return next;
      });
    },
    [userId]
  );

  const removeFromHistory = useCallback(
    (query: string) => {
      if (!userId) return;
      setHistory((prev) => {
        const next = prev.filter((q) => q !== query);
        writeHistory(userId, next);
        return next;
      });
    },
    [userId]
  );

  const clearHistory = useCallback(() => {
    if (!userId) return;
    writeHistory(userId, []);
    setHistory([]);
  }, [userId]);

  return { history, addToHistory, removeFromHistory, clearHistory };
}

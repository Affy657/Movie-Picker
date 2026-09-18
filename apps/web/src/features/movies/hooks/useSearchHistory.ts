import { useCallback, useEffect, useState } from 'react';

const MAX_HISTORY = 5;

function storageKey(userId: string) {
  return `moviepicker_search_history_${userId}`;
}

function sameQuery(a: string, b: string): boolean {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

function isStrictPrefix(short: string, long: string): boolean {
  return (
    short.length < long.length && long.toLocaleLowerCase().startsWith(short.toLocaleLowerCase())
  );
}

function sanitize(entries: unknown): string[] {
  if (!Array.isArray(entries)) return [];
  const clean: string[] = [];
  for (const entry of entries) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed || clean.some((q) => sameQuery(q, trimmed))) continue;
    clean.push(trimmed);
  }
  return clean.slice(0, MAX_HISTORY);
}

function readHistory(userId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? sanitize(JSON.parse(raw)) : [];
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

function withQueryOnTop(history: string[], query: string): string[] {
  const head = history[0];
  if (head && isStrictPrefix(query, head)) return history;
  const kept = history.filter((q) => !sameQuery(q, query) && !isStrictPrefix(q, query));
  return [query, ...kept].slice(0, MAX_HISTORY);
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
        const next = withQueryOnTop(prev, trimmed);
        if (next !== prev) writeHistory(userId, next);
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

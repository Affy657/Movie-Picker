import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';
import { readHistoryEntryValue, writeHistoryEntryValue } from '@/shared/hooks/useHistoryEntryState';

const SCROLL_POSITION_NAME = 'scrollY';
const RESTORE_TIMEOUT_MS = 2000;
const READER_SCROLL_INTENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

interface VisitedEntry {
  key: string;
  pathname: string;
  search: string;
}

function storedScrollY(entryKey: string): number | null {
  const value = readHistoryEntryValue(entryKey, SCROLL_POSITION_NAME);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function maxScrollY(): number {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function restoreScrollY(targetY: number): () => void {
  const deadline = performance.now() + RESTORE_TIMEOUT_MS;
  let frame = 0;
  const stop = (): void => {
    cancelAnimationFrame(frame);
    for (const type of READER_SCROLL_INTENTS) window.removeEventListener(type, stop);
  };
  const attempt = (): void => {
    if (maxScrollY() < targetY && performance.now() < deadline) {
      frame = requestAnimationFrame(attempt);
      return;
    }
    stop();
    if (window.scrollY !== targetY) window.scrollTo(0, targetY);
  };
  for (const type of READER_SCROLL_INTENTS) {
    window.addEventListener(type, stop, { passive: true });
  }
  attempt();
  return stop;
}

export default function ScrollToTop() {
  const { key, pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();
  const currentEntry = useRef<VisitedEntry | null>(null);
  const currentScrollY = useRef(0);
  const scrollYByEntry = useRef(new Map<string, number>());
  const cancelRestore = useRef<() => void>(() => undefined);

  useEffect(() => {
    const { history } = window;
    const browserMode = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const recordScroll = (): void => {
      currentScrollY.current = window.scrollY;
    };
    const keepCurrentEntryScroll = (): void => {
      const entry = currentEntry.current;
      if (entry) writeHistoryEntryValue(entry.key, SCROLL_POSITION_NAME, currentScrollY.current);
    };
    window.addEventListener('scroll', recordScroll, { passive: true });
    window.addEventListener('pagehide', keepCurrentEntryScroll);
    return () => {
      history.scrollRestoration = browserMode;
      window.removeEventListener('scroll', recordScroll);
      window.removeEventListener('pagehide', keepCurrentEntryScroll);
    };
  }, []);

  useLayoutEffect(() => {
    const previous = currentEntry.current;
    if (previous?.key === key) return;
    currentEntry.current = { key, pathname, search };
    cancelRestore.current();

    if (previous) {
      scrollYByEntry.current.set(previous.key, currentScrollY.current);
      writeHistoryEntryValue(previous.key, SCROLL_POSITION_NAME, currentScrollY.current);
    }

    if (navigationType === 'POP') {
      const targetY = scrollYByEntry.current.get(key) ?? storedScrollY(key);
      if (targetY !== null) cancelRestore.current = restoreScrollY(targetY);
    } else {
      const isFilterChangeOnSamePage =
        previous?.pathname === pathname && previous.search !== search;
      if (!hash && !isFilterChangeOnSamePage) window.scrollTo(0, 0);
    }
    currentScrollY.current = window.scrollY;
  }, [key, pathname, search, hash, navigationType]);

  return null;
}

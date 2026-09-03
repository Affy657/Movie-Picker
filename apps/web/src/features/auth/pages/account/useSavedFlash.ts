import { useCallback, useEffect, useRef, useState } from 'react';

const SAVED_FLASH_MS = 2500;

export function useSavedFlash(): [boolean, () => void] {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => globalThis.clearTimeout(timerRef.current), []);

  const flash = useCallback(() => {
    setSavedAt(Date.now());
    globalThis.clearTimeout(timerRef.current);
    timerRef.current = globalThis.setTimeout(() => setSavedAt(null), SAVED_FLASH_MS);
  }, []);

  return [savedAt !== null, flash];
}

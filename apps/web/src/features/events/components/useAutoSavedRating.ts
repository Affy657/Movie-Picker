import { useCallback, useRef, useState } from 'react';

export type RatingSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export function useAutoSavedRating(
  mine: number | null,
  onSave: (value: number) => Promise<boolean>,
  onClear: () => Promise<boolean>
) {
  const [draft, setDraft] = useState<number | null>(mine);
  const [status, setStatus] = useState<RatingSaveStatus>('idle');
  const running = useRef(false);
  const queued = useRef<number | null>(null);
  const lastAttempt = useRef<() => void>(() => {});

  const send = useCallback(
    async (value: number) => {
      lastAttempt.current = () => void send(value);
      running.current = true;
      setStatus('saving');
      const saved = await onSave(value);
      running.current = false;
      const next = queued.current;
      queued.current = null;
      if (next !== null && next !== value) {
        await send(next);
        return;
      }
      setStatus(saved ? 'saved' : 'failed');
    },
    [onSave]
  );

  const pick = useCallback(
    (value: number) => {
      setDraft(value);
      if (running.current) {
        queued.current = value;
        return;
      }
      void send(value);
    },
    [send]
  );

  const clear = useCallback(async () => {
    lastAttempt.current = () => void clear();
    setStatus('saving');
    const cleared = await onClear();
    if (cleared) setDraft(null);
    setStatus(cleared ? 'idle' : 'failed');
  }, [onClear]);

  const retry = useCallback(() => lastAttempt.current(), []);

  return { draft, status, pick, retry, clear };
}

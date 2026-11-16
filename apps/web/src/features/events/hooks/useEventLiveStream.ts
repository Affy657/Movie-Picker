import { useEffect, useRef, useState } from 'react';
import { eventStreamUrl } from '@/features/events/api/eventsApi';
import { useDocumentVisible } from '@/shared/hooks/useDocumentVisible';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

export const EVENT_STREAM_STALE_AFTER_MS = 25_000;

export const EVENT_STREAM_REOPEN_AFTER_FAILURE_MS = 30_000;

const EVENT_STREAM_RECONNECT_DELAY_MS = 2_000;

const EVENT_STREAM_WATCHDOG_MS = 5_000;

export type LivePresence = { participantId: string; proposing: boolean };

export type UseEventLiveStreamInput = {
  slug: string | undefined;
  enabled: boolean;
  onChanged: () => void;
};

function isLivePresence(value: unknown): value is LivePresence {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<LivePresence>;
  return typeof entry.participantId === 'string' && typeof entry.proposing === 'boolean';
}

function parsePresence(data: unknown): LivePresence[] | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed = JSON.parse(data) as { participants?: unknown };
    const participants = parsed.participants;
    if (!Array.isArray(participants) || !participants.every(isLivePresence)) return null;
    return participants.map(({ participantId, proposing }) => ({ participantId, proposing }));
  } catch {
    return null;
  }
}

function supportsEventSource(): boolean {
  return typeof globalThis.EventSource === 'function';
}

export function useEventLiveStream({ slug, enabled, onChanged }: UseEventLiveStreamInput): {
  connected: boolean;
  presence: LivePresence[] | null;
} {
  const online = useOnlineStatus();
  const visible = useDocumentVisible();
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<LivePresence[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const onChangedRef = useRef(onChanged);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  const active = enabled && !!slug && online && visible && supportsEventSource();

  useEffect(() => {
    if (!active || !slug) return;
    const source = new EventSource(eventStreamUrl(slug), { withCredentials: true });
    let lastMessageAt = Date.now();
    let reopenTimer: ReturnType<typeof setTimeout> | undefined;

    const heardFromServer = (): void => {
      lastMessageAt = Date.now();
    };
    const reopenAfter = (delayMs: number): void => {
      source.close();
      setConnected(false);
      reopenTimer = globalThis.setTimeout(() => setAttempt((value) => value + 1), delayMs);
    };

    source.addEventListener('ready', () => {
      heardFromServer();
      setConnected(true);
      onChangedRef.current();
    });
    source.addEventListener('changed', () => {
      heardFromServer();
      onChangedRef.current();
    });
    source.addEventListener('presence', (event) => {
      heardFromServer();
      const next = parsePresence((event as MessageEvent).data);
      if (next) setPresence(next);
    });
    source.addEventListener('ping', heardFromServer);
    source.onerror = () => {
      setConnected(false);
      if (source.readyState === EventSource.CLOSED)
        reopenAfter(EVENT_STREAM_REOPEN_AFTER_FAILURE_MS);
    };

    const watchdog = globalThis.setInterval(() => {
      if (Date.now() - lastMessageAt < EVENT_STREAM_STALE_AFTER_MS) return;
      globalThis.clearInterval(watchdog);
      reopenAfter(EVENT_STREAM_RECONNECT_DELAY_MS);
    }, EVENT_STREAM_WATCHDOG_MS);

    return () => {
      globalThis.clearInterval(watchdog);
      globalThis.clearTimeout(reopenTimer);
      source.close();
      setConnected(false);
      setPresence(null);
    };
  }, [active, slug, attempt]);

  return { connected: active && connected, presence: active ? presence : null };
}

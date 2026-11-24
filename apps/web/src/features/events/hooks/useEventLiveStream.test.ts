import { act, renderHook } from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EVENT_STREAM_REOPEN_AFTER_FAILURE_MS,
  EVENT_STREAM_STALE_AFTER_MS,
  useEventLiveStream,
} from '@/features/events/hooks/useEventLiveStream';
import { FakeEventSource } from '@/test-utils/fakeEventSource';

function latest(): FakeEventSource {
  return FakeEventSource.latest();
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useEventLiveStream', () => {
  beforeEach(() => {
    FakeEventSource.install();
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    onlineManager.setOnline(true);
    setVisibility('visible');
  });

  it('opens a credentialed stream on the event when enabled', () => {
    renderHook(() => useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() }));

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(latest().url).toMatch(/\/api\/v1\/events\/soiree\/stream\?tab=[\w-]{8,64}$/);
    expect(latest().init).toEqual({ withCredentials: true });
  });

  it('opens nothing when disabled or when the browser has no EventSource', () => {
    const { result } = renderHook(() =>
      useEventLiveStream({ slug: 'soiree', enabled: false, onChanged: vi.fn() })
    );
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(result.current.connected).toBe(false);

    vi.stubGlobal('EventSource', undefined);
    renderHook(() => useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() }));
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('reloads once connected and on every change', () => {
    const onChanged = vi.fn();
    const { result } = renderHook(() =>
      useEventLiveStream({ slug: 'soiree', enabled: true, onChanged })
    );

    act(() => latest().emit('ready'));
    expect(result.current.connected).toBe(true);
    expect(onChanged).toHaveBeenCalledTimes(1);

    act(() => latest().emit('changed', { stamp: '4.2' }));
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it('exposes who is present and who is proposing', () => {
    const { result } = renderHook(() =>
      useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() })
    );
    expect(result.current.presence).toBeNull();

    act(() =>
      latest().emit('presence', {
        participants: [
          { participantId: 'p-1', proposing: false },
          { participantId: 'p-2', proposing: true },
        ],
      })
    );

    expect(result.current.presence).toEqual([
      { participantId: 'p-1', proposing: false },
      { participantId: 'p-2', proposing: true },
    ]);
  });

  it('ignores a malformed presence message', () => {
    const { result } = renderHook(() =>
      useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() })
    );

    act(() => latest().emit('presence', { participants: 'nope' }));

    expect(result.current.presence).toBeNull();
  });

  it('falls back to polling and reconnects when the stream goes silent', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() })
    );
    act(() => latest().emit('ready'));
    const first = latest();

    act(() => vi.advanceTimersByTime(EVENT_STREAM_STALE_AFTER_MS + 5_000));

    expect(result.current.connected).toBe(false);
    expect(first.closed).toBe(true);
    expect(FakeEventSource.instances.length).toBeGreaterThan(1);
  });

  it('stays connected while pings arrive', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() })
    );
    act(() => latest().emit('ready'));

    for (let i = 0; i < 4; i++) {
      act(() => vi.advanceTimersByTime(15_000));
      act(() => latest().emit('ping'));
    }

    expect(result.current.connected).toBe(true);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('marks itself disconnected while the browser retries, and reconnects on ready', () => {
    const { result } = renderHook(() =>
      useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() })
    );
    act(() => latest().emit('ready'));

    act(() => latest().fail(FakeEventSource.CONNECTING));
    expect(result.current.connected).toBe(false);

    act(() => latest().emit('ready'));
    expect(result.current.connected).toBe(true);
  });

  it('reopens a stream the browser gave up on, after a pause', () => {
    vi.useFakeTimers();
    renderHook(() => useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() }));

    act(() => latest().fail(FakeEventSource.CLOSED));
    expect(FakeEventSource.instances).toHaveLength(1);

    act(() => vi.advanceTimersByTime(EVENT_STREAM_REOPEN_AFTER_FAILURE_MS));
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('reopens once, only after the pause the server asked for, when the stream is refused', () => {
    vi.useFakeTimers();
    renderHook(() => useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() }));

    act(() => latest().fail(FakeEventSource.CLOSED));
    act(() => vi.advanceTimersByTime(EVENT_STREAM_REOPEN_AFTER_FAILURE_MS - 3_000));
    expect(FakeEventSource.instances).toHaveLength(1);

    act(() => vi.advanceTimersByTime(3_000));
    expect(FakeEventSource.instances).toHaveLength(2);

    act(() => vi.advanceTimersByTime(EVENT_STREAM_STALE_AFTER_MS - 1_000));
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('reopens the stream when the participant changes, so the server sees who just joined', () => {
    const { rerender } = renderHook(
      ({ participantId }: { participantId: string | null }) =>
        useEventLiveStream({ slug: 'soiree', enabled: true, participantId, onChanged: vi.fn() }),
      { initialProps: { participantId: null as string | null } }
    );
    const first = latest();

    rerender({ participantId: 'p-new' });

    expect(first.closed).toBe(true);
    expect(FakeEventSource.instances).toHaveLength(2);

    rerender({ participantId: 'p-new' });
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('closes while the tab is hidden and reopens when it comes back', () => {
    const { result } = renderHook(() =>
      useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() })
    );
    act(() => latest().emit('ready'));
    const first = latest();

    act(() => setVisibility('hidden'));
    expect(first.closed).toBe(true);
    expect(result.current.connected).toBe(false);

    act(() => setVisibility('visible'));
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('names the same tab on every stream it opens, so the server can drop the one it replaces', () => {
    renderHook(() => useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() }));
    const tab = new URL(latest().url).searchParams.get('tab');

    act(() => setVisibility('hidden'));
    act(() => setVisibility('visible'));

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(tab).toMatch(/^[\w-]{8,64}$/);
    expect(new URL(latest().url).searchParams.get('tab')).toBe(tab);
  });

  it('closes while offline', () => {
    renderHook(() => useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() }));
    const first = latest();

    act(() => onlineManager.setOnline(false));

    expect(first.closed).toBe(true);
  });

  it('closes on unmount', () => {
    const { unmount } = renderHook(() =>
      useEventLiveStream({ slug: 'soiree', enabled: true, onChanged: vi.fn() })
    );

    unmount();

    expect(latest().closed).toBe(true);
  });
});

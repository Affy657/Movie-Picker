import { renderHook } from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROPOSING_REFRESH_MS,
  useProposingPresence,
} from '@/features/events/hooks/useProposingPresence';

const api = vi.hoisted(() => ({ setEventPresence: vi.fn() }));

vi.mock('@/features/events/api/eventsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/events/api/eventsApi')>()),
  ...api,
}));

describe('useProposingPresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    api.setEventPresence.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    onlineManager.setOnline(true);
  });

  it('tells the others as long as the proposal window stays open', () => {
    renderHook(() => useProposingPresence({ slug: 'soiree', active: true }));
    expect(api.setEventPresence).toHaveBeenCalledWith('soiree', true);

    vi.advanceTimersByTime(PROPOSING_REFRESH_MS * 2);

    expect(api.setEventPresence).toHaveBeenCalledTimes(3);
  });

  it('withdraws the signal when the window closes', () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useProposingPresence({ slug: 'soiree', active }),
      { initialProps: { active: true } }
    );

    rerender({ active: false });

    expect(api.setEventPresence).toHaveBeenLastCalledWith('soiree', false);
    vi.advanceTimersByTime(PROPOSING_REFRESH_MS * 2);
    expect(api.setEventPresence).toHaveBeenCalledTimes(2);
  });

  it('sends nothing while nobody proposes, or while offline', () => {
    renderHook(() => useProposingPresence({ slug: 'soiree', active: false }));
    onlineManager.setOnline(false);
    renderHook(() => useProposingPresence({ slug: 'soiree', active: true }));

    expect(api.setEventPresence).not.toHaveBeenCalled();
  });

  it('swallows a failed signal', () => {
    api.setEventPresence.mockRejectedValue(new Error('nope'));

    expect(() =>
      renderHook(() => useProposingPresence({ slug: 'soiree', active: true }))
    ).not.toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistoryToolbar } from './useHistoryToolbar';
import type { MyEventSummary } from '@/features/events/types';

function event(overrides: Partial<MyEventSummary>): MyEventSummary {
  return {
    id: overrides.id ?? 'e',
    slug: overrides.slug ?? 'e',
    title: overrides.title ?? 'Titre',
    date: '2026-06-01',
    time: '20:00',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isCreator: false,
    isParticipant: true,
    movieCount: 0,
    participantCount: 0,
    ...overrides,
  };
}

const EVENTS: MyEventSummary[] = [
  event({
    id: 'a',
    title: 'Alpha',
    date: '2026-08-01',
    isCreator: true,
    movieCount: 5,
    participantCount: 2,
    winnerMovies: [{ title: 'Matrix' }],
  }),
  event({
    id: 'b',
    title: 'Beta',
    date: '2026-06-01',
    isCreator: false,
    movieCount: 1,
    participantCount: 8,
    winnerMovies: [],
  }),
  event({
    id: 'c',
    title: 'Gamma',
    date: '2026-07-01',
    isCreator: true,
    movieCount: 3,
    participantCount: 5,
    winnerMovies: [{ title: 'Inception' }],
  }),
];

describe('useHistoryToolbar', () => {
  it('sorts by date descending by default', () => {
    const { result } = renderHook(() => useHistoryToolbar({ events: EVENTS }));
    expect(result.current.visibleEvents.map((e) => e.id)).toEqual(['a', 'c', 'b']);
  });

  it('toggles direction when the same sort key is clicked again', () => {
    const { result } = renderHook(() => useHistoryToolbar({ events: EVENTS }));
    act(() => result.current.setSortBy('date'));
    expect(result.current.sortDir).toBe('asc');
    expect(result.current.visibleEvents.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('switches sort key to its own default direction', () => {
    const { result } = renderHook(() => useHistoryToolbar({ events: EVENTS }));
    act(() => result.current.setSortBy('title'));
    expect(result.current.sortDir).toBe('asc');
    expect(result.current.visibleEvents.map((e) => e.id)).toEqual(['a', 'b', 'c']);

    act(() => result.current.setSortBy('movieCount'));
    expect(result.current.sortDir).toBe('desc');
    expect(result.current.visibleEvents.map((e) => e.id)).toEqual(['a', 'c', 'b']);

    act(() => result.current.setSortBy('participantCount'));
    expect(result.current.sortDir).toBe('desc');
    expect(result.current.visibleEvents.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('filters by role', () => {
    const { result } = renderHook(() => useHistoryToolbar({ events: EVENTS }));
    act(() => result.current.toggleRole('hosted'));
    expect(result.current.visibleEvents.map((e) => e.id).sort()).toEqual(['a', 'c']);
    expect(result.current.activeFilterCount).toBe(1);
  });

  it('filters by outcome', () => {
    const { result } = renderHook(() => useHistoryToolbar({ events: EVENTS }));
    act(() => result.current.toggleOutcome('withoutWinner'));
    expect(result.current.visibleEvents.map((e) => e.id)).toEqual(['b']);
  });

  it('combines role and outcome filters', () => {
    const { result } = renderHook(() => useHistoryToolbar({ events: EVENTS }));
    act(() => result.current.toggleRole('hosted'));
    act(() => result.current.toggleOutcome('withWinner'));
    expect(result.current.visibleEvents.map((e) => e.id).sort()).toEqual(['a', 'c']);
    expect(result.current.activeFilterCount).toBe(2);
  });

  it('clearAllFilters resets roles and outcomes but keeps the search term', () => {
    const { result } = renderHook(() => useHistoryToolbar({ events: EVENTS }));
    act(() => result.current.setSearch('matrix'));
    act(() => result.current.toggleRole('hosted'));
    act(() => result.current.toggleOutcome('withWinner'));
    act(() => result.current.clearAllFilters());
    expect(result.current.activeFilterCount).toBe(0);
    expect(result.current.search).toBe('matrix');
  });
});

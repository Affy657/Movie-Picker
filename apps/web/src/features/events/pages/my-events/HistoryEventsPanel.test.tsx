import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import type { MyEventSummary } from '@/features/events/types';
import HistoryEventsPanel from './HistoryEventsPanel';
import { useHistoryToolbar } from './useHistoryToolbar';
import type { MyEventsActions } from './useMyEventsActions';

const LOADED_EVENTS: MyEventSummary[] = [
  {
    id: 'a',
    slug: 'a',
    title: 'Soirée avec un film',
    date: '2026-08-01',
    time: '20:00',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isCreator: true,
    isParticipant: true,
    movieCount: 2,
    participantCount: 2,
    winnerMovies: [{ title: 'Matrix' }],
  },
];

const ACTIONS = {
  deleteError: null,
  handleDeleteEvent: vi.fn(),
  handleReuseEvent: vi.fn(),
} as unknown as MyEventsActions;

function Panel({
  hasNextPage,
  fetchNextPage,
}: Readonly<{ hasNextPage: boolean; fetchNextPage: () => void }>) {
  const toolbar = useHistoryToolbar({ events: LOADED_EVENTS });
  return (
    <HistoryEventsPanel
      totalFinished={12}
      events={LOADED_EVENTS}
      searchQuery=""
      query={{
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        hasNextPage,
        isFetchingNextPage: false,
        fetchNextPage,
      }}
      toolbar={toolbar}
      actions={ACTIONS}
    />
  );
}

async function filterOutEveryLoadedNight(hasNextPage: boolean, fetchNextPage = vi.fn()) {
  const user = userEvent.setup();
  render(
    <AppTestProviders>
      <MemoryRouter>
        <Panel hasNextPage={hasNextPage} fetchNextPage={fetchNextPage} />
      </MemoryRouter>
    </AppTestProviders>
  );
  await user.click(screen.getByRole('button', { name: 'Filtres' }));
  await user.click(screen.getByRole('button', { name: 'Sans film choisi' }));
  return user;
}

describe('HistoryEventsPanel', () => {
  it('keeps the next page within reach when the filters empty the loaded nights', async () => {
    const fetchNextPage = vi.fn();

    const user = await filterOutEveryLoadedNight(true, fetchNextPage);

    expect(screen.queryByText('Soirée avec un film')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Charger 11 soirées de plus' }));
    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it('offers no next page once every night is loaded', async () => {
    await filterOutEveryLoadedNight(false);

    expect(screen.queryByRole('button', { name: /charger/i })).toBeNull();
  });
});

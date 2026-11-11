import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import type { MyEventSummary } from '@/features/events/types';
import HistoryEventsPanel from './HistoryEventsPanel';
import type { MyEventsActions } from './useMyEventsActions';

function night(id: string, date: string): MyEventSummary {
  return {
    id,
    slug: id,
    title: `Soirée ${id}`,
    date,
    time: '20:00',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isCreator: true,
    isParticipant: true,
    movieCount: 2,
    participantCount: 2,
    winnerMovies: [{ title: 'Matrix' }],
  };
}

const ACTIONS = {
  deleteError: null,
  handleDeleteEvent: vi.fn(),
  handleReuseEvent: vi.fn(),
} as unknown as MyEventsActions;

function renderPanel({
  totalFinished = 12,
  events = [night('a', '2026-08-01'), night('b', '2026-08-12'), night('c', '2026-07-03')],
  hasNextPage = false,
  fetchNextPage = vi.fn(),
}: {
  totalFinished?: number;
  events?: MyEventSummary[];
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
} = {}) {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <HistoryEventsPanel
          totalFinished={totalFinished}
          events={events}
          query={{
            isLoading: false,
            isError: false,
            error: null,
            refetch: vi.fn(),
            hasNextPage,
            isFetchingNextPage: false,
            fetchNextPage,
          }}
          actions={ACTIONS}
        />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('HistoryEventsPanel', () => {
  it('titles the history with its total and groups the nights by month', () => {
    renderPanel();

    const section = screen.getByRole('region', { name: 'Historique' });
    expect(section).toHaveTextContent('12');
    const august = screen.getByRole('region', { name: /août 2026/i });
    expect(within(august).getByText('2 soirées')).toBeInTheDocument();
    expect(within(august).getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('region', { name: /juillet 2026/i })).toHaveTextContent('1 soirée');
  });

  it('offers no search, filter nor sort', () => {
    renderPanel();

    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Filtres' })).toBeNull();
    expect(screen.queryByText(/trier/i)).toBeNull();
  });

  it('loads the next page on demand', async () => {
    const fetchNextPage = vi.fn();
    renderPanel({ hasNextPage: true, fetchNextPage });

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Charger 9 soirées de plus' }));

    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it('offers no next page once every night is loaded', () => {
    renderPanel();

    expect(screen.queryByRole('button', { name: /charger/i })).toBeNull();
  });

  it('disappears when no night is finished yet', () => {
    const { container } = renderPanel({ totalFinished: 0, events: [] });

    expect(container).toBeEmptyDOMElement();
  });
});

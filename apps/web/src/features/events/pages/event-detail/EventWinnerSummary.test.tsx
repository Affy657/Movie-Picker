import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EventWinnerSummary from '@/features/events/pages/event-detail/EventWinnerSummary';
import { LocaleProvider } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';

function movie(overrides: Partial<MovieData>): MovieData {
  return {
    id: 'm1',
    eventId: 'evt1',
    participantId: 'p1',
    tmdbId: 1,
    mediaType: 'movie',
    title: 'Matrix',
    year: '1999',
    posterPath: null,
    proposerPseudo: 'Alice',
    score: 0,
    up: 0,
    down: 0,
    voteAverage: 8.3,
    runtimeMinutes: 136,
    ...overrides,
  };
}

function renderSummary(ui: React.ReactElement) {
  return render(
    <LocaleProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </LocaleProvider>
  );
}

describe('EventWinnerSummary', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('renders nothing without a winner', () => {
    const { container } = renderSummary(<EventWinnerSummary winners={[]} isFinished />);
    expect(container).toBeEmptyDOMElement();
  });

  it('presents the single movie of a finished night with its facts and proposer', () => {
    renderSummary(<EventWinnerSummary winners={[movie({})]} isFinished />);
    expect(screen.getByRole('heading', { name: 'Le film de la soirée' })).toBeInTheDocument();
    expect(screen.getByText('Matrix')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText('2h16')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('numbers several winners in draw order and keeps the night open when not finished', () => {
    renderSummary(
      <EventWinnerSummary
        winners={[movie({ id: 'm2', title: 'Alien' }), movie({ id: 'm1', title: 'Matrix' })]}
        isFinished={false}
      />
    );
    expect(screen.getByRole('heading', { name: 'Ce soir, vous regardez' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Alien');
    expect(items[0]).toHaveTextContent('1');
    expect(items[1]).toHaveTextContent('Matrix');
    expect(items[1]).toHaveTextContent('2');
  });
});

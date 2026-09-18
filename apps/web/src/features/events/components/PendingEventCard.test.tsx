import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import PendingEventCard from '@/features/events/components/PendingEventCard';
import type { MyEventSummary } from '@/features/events/types';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

vi.mock('@/shared/hooks/useIsMobile', () => ({ useIsMobile: vi.fn(() => false) }));

const pending: MyEventSummary = {
  id: 'e1',
  slug: 'cine-club',
  title: 'Ciné-club hebdomadaire',
  date: '2026-06-10',
  time: '20:30',
  createdAt: '2026-06-01T10:00:00Z',
  updatedAt: '2026-06-01T10:00:00Z',
  isCreator: true,
  isParticipant: true,
  lifecycle: 'pending',
  participantCount: 1,
  maxParticipants: 8,
  movieCount: 4,
  theme: 'Un classique par semaine',
  autoCloseAt: '2026-06-19T12:00:00Z',
};

function renderCard() {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <PendingEventCard event={pending} onCloseWithoutMovie={() => {}} />
      </LocaleProvider>
    </MemoryRouter>
  );
}

describe('PendingEventCard', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    vi.mocked(useIsMobile).mockReturnValue(false);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the pending pill, the automatic closing and the date tile with its time', () => {
    renderCard();

    expect(screen.getByText('En suspens')).toBeInTheDocument();
    expect(screen.getByText('Clôture automatique dans 4 jours')).toBeInTheDocument();
    expect(screen.getByText('20h30').parentElement).toHaveTextContent('juin10');
    expect(screen.getByText('mercredi 10 juin à 20h30')).toHaveClass('visually-hidden');
    expect(screen.getByText('il y a 5 jours')).toBeInTheDocument();
    expect(screen.getByText('Hôte')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choisir le film' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clôturer sans film' })).toBeInTheDocument();
  });

  it('on mobile, shortens the closing notice and the countdown so each line holds', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    renderCard();

    expect(screen.getByText('Clôture dans 4 jours')).toBeInTheDocument();
    expect(screen.getByText('il y a 5 j')).toBeInTheDocument();
    expect(screen.getByText('Hôte')).toHaveClass('visually-hidden');
  });
});

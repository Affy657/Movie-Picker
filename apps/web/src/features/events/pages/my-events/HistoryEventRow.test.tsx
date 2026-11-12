import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import HistoryEventRow from '@/features/events/pages/my-events/HistoryEventRow';
import type { MyEventSummary } from '@/features/events/types';
import { LocaleProvider } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';

const auth = vi.hoisted(() => ({
  user: { userId: 'u1', ratingScale: 'five' } as { userId: string; ratingScale: string } | null,
}));

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user }),
}));

const base: MyEventSummary = {
  id: 'e1',
  slug: 'soiree',
  title: 'Ciné-club du mardi',
  date: '2026-09-02',
  time: '20:00',
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-09-02T23:00:00Z',
  isCreator: true,
  isParticipant: true,
  lifecycle: 'finished',
  participantCount: 6,
  movieCount: 8,
  winnerMovies: [],
};

const won: Pick<MyEventSummary, 'winnerMovies'> = {
  winnerMovies: [{ title: 'Parasite', posterPath: '/p.jpg' }],
};

function renderRow(event: MyEventSummary, handlers: { onDelete?: () => void } = {}) {
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <HistoryEventRow event={event} {...handlers} />
      </MemoryRouter>
    </LocaleProvider>
  );
}

describe('HistoryEventRow', () => {
  beforeEach(() => {
    auth.user = { userId: 'u1', ratingScale: 'five' };
  });

  it('titles the card with the night and names its movie under it', () => {
    renderRow({ ...base, ...won });

    expect(
      screen.getByRole('heading', { name: 'Ciné-club du mardi', level: 4 })
    ).toBeInTheDocument();
    expect(screen.getByText('Le film de la soirée')).toBeInTheDocument();
    expect(screen.getByText('Parasite')).toBeInTheDocument();
  });

  it('names the first movie and counts the others when several movies won', () => {
    renderRow({
      ...base,
      winnerMovies: [
        { title: 'Parasite', posterPath: '/p.jpg' },
        { title: 'Whiplash', posterPath: '/w.jpg' },
        { title: 'Perfect Days', posterPath: null },
      ],
    });

    expect(screen.getByText('Les 3 films de la soirée')).toBeInTheDocument();
    expect(screen.getByText('Parasite et 2 autres')).toBeInTheDocument();
  });

  it('keeps the other movie in the singular', () => {
    renderRow({
      ...base,
      winnerMovies: [
        { title: 'Parasite', posterPath: '/p.jpg' },
        { title: 'Whiplash', posterPath: '/w.jpg' },
      ],
    });

    expect(screen.getByText('Parasite et 1 autre')).toBeInTheDocument();
  });

  it('stacks the posters of the first two winners, the first one in front', () => {
    renderRow({
      ...base,
      winnerMovies: [
        { title: 'Parasite', posterPath: '/premier.jpg' },
        { title: 'Whiplash', posterPath: '/second.jpg' },
        { title: 'Perfect Days', posterPath: '/troisieme.jpg' },
      ],
    });

    const images = document.querySelectorAll('img');
    expect(images).toHaveLength(3);
    expect(images[0]!.getAttribute('src')).toContain('premier.jpg');
    expect(images[1]!.getAttribute('src')).toContain('premier.jpg');
    expect(images[2]!.getAttribute('src')).toContain('second.jpg');
  });

  it('carries the date block and the host mark, without the counts', () => {
    renderRow({ ...base, ...won, maxParticipants: 8 });

    expect(screen.getByText('sept.')).toBeInTheDocument();
    expect(screen.getByText('mer.')).toBeInTheDocument();
    expect(screen.getByTitle('Vous organisez cette soirée')).toHaveTextContent('Hôte');
    expect(screen.queryByText('6 / 8')).not.toBeInTheDocument();
    expect(screen.queryByText('8 films proposés')).not.toBeInTheDocument();
  });

  it('leaves the host mark out for a guest', () => {
    renderRow({ ...base, ...won, isCreator: false });

    expect(screen.queryByTitle('Vous organisez cette soirée')).not.toBeInTheDocument();
  });

  it('says the night ended without a movie when nothing won', () => {
    renderRow(base);

    expect(
      screen.getByRole('heading', { name: 'Ciné-club du mardi', level: 4 })
    ).toBeInTheDocument();
    expect(screen.getByText('Terminée sans film choisi')).toBeInTheDocument();
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });

  it('links the card to the event and keeps its menu beside it', () => {
    renderRow({ ...base, ...won }, { onDelete: () => undefined });

    const link = screen.getByRole('link', { name: /Ciné-club du mardi/ });
    expect(link).toHaveAttribute('href', ROUTES.eventDetail('soiree'));
    const menu = screen.getByRole('button', { name: 'Options pour Ciné-club du mardi' });
    expect(link).not.toContainElement(menu);
  });

  it('shows the group average and the rating of the viewer', () => {
    renderRow({ ...base, ...won, averageRating: 7, myRating: 6, hasWinnerToRate: false });

    expect(screen.getByText('3,5/5')).toBeInTheDocument();
    expect(screen.getByText('Vous 3/5')).toBeInTheDocument();
    expect(screen.queryByText('À noter')).not.toBeInTheDocument();
  });

  it('keeps the half of the viewer rating averaged over several movies', () => {
    renderRow({ ...base, ...won, averageRating: 8, myRating: 9, hasWinnerToRate: false });

    expect(screen.getByText('Vous 4,5/5')).toBeInTheDocument();
  });

  it('reads the ratings on the scale of the viewer', () => {
    auth.user = { userId: 'u1', ratingScale: 'ten' };

    renderRow({ ...base, ...won, averageRating: 7, myRating: 6, hasWinnerToRate: false });

    expect(screen.getByText('7,0/10')).toBeInTheDocument();
    expect(screen.getByText('Vous 6/10')).toBeInTheDocument();
  });

  it('reads the ratings out of five without a viewer scale', () => {
    auth.user = null;

    renderRow({ ...base, ...won, averageRating: 7 });

    expect(screen.getByText('3,5/5')).toBeInTheDocument();
  });

  it('asks to rate next to the average when a winner is left to rate', () => {
    renderRow({ ...base, ...won, averageRating: 9.6, hasWinnerToRate: true });

    expect(screen.getByText('4,8/5')).toBeInTheDocument();
    expect(screen.getByText('À noter')).toBeInTheDocument();
  });

  it('prefers asking to rate over a rating that covers only some of the movies', () => {
    renderRow({ ...base, ...won, averageRating: 8, myRating: 8, hasWinnerToRate: true });

    expect(screen.getByText('À noter')).toBeInTheDocument();
    expect(screen.queryByText('Vous 4/5')).not.toBeInTheDocument();
  });

  it('shows only the invitation to rate before any rating', () => {
    renderRow({ ...base, ...won, averageRating: null, hasWinnerToRate: true });

    expect(screen.getByText('À noter')).toBeInTheDocument();
    expect(document.querySelector('.lucide-star')).toBeNull();
  });

  it('shows no rating line when there is nothing to read nor to rate', () => {
    renderRow({ ...base, ...won, averageRating: null, hasWinnerToRate: false });

    expect(screen.queryByText('À noter')).not.toBeInTheDocument();
    expect(document.querySelector('.lucide-star')).toBeNull();
  });
});

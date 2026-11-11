import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { MyEventSummary } from '@/features/events/types';
import { LocaleProvider } from '@/shared/i18n';
import UpcomingEventCard, { upcomingCardPosters } from './UpcomingEventCard';

const base: MyEventSummary = {
  id: 'e1',
  slug: 'chez-lea',
  title: 'Soirée chez Léa',
  date: '2035-11-16',
  time: '20:30',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  isCreator: false,
  isParticipant: true,
  lifecycle: 'upcoming',
  participantCount: 6,
  movieCount: 6,
  theme: 'Nuits blanches',
  hasVoted: true,
  topMovies: [
    { title: 'Le Dernier Projectionniste', posterPath: '/a.jpg' },
    { title: 'Orbite basse', posterPath: '/b.jpg' },
    { title: 'Minuit à Kyoto', posterPath: null },
  ],
  participantsPreview: [
    { pseudo: 'Léa', avatarId: '' },
    { pseudo: 'Nico', avatarId: '' },
    { pseudo: 'Inès', avatarId: '' },
    { pseudo: 'Sam', avatarId: '' },
  ],
};

function renderCard(event: MyEventSummary, onLeave?: () => void) {
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <UpcomingEventCard event={event} onLeave={onLeave} />
      </MemoryRouter>
    </LocaleProvider>
  );
}

describe('UpcomingEventCard', () => {
  it('links to the night with its date, theme, people and the start countdown', () => {
    renderCard(base);

    const link = screen.getByRole('link', { name: /Soirée chez Léa/ });
    expect(link).toHaveAttribute('href', '/e/chez-lea');
    expect(within(link).getByText('Nuits blanches')).toBeInTheDocument();
    expect(within(link).getByText('6 participants, 6 films')).toBeInTheDocument();
    expect(within(link).getByText('16')).toBeInTheDocument();
    expect(within(link).getByText(/vendredi 16 nov/i)).toBeInTheDocument();
    expect(within(link).getByText('Commence dans')).toHaveTextContent(/Commence dans \d+ j/);
    expect(within(link).getByText('+2')).toBeInTheDocument();
  });

  it('blurs the first poster behind the card and fans out the posters in list order', () => {
    renderCard(base);

    const images = document.querySelectorAll('img');
    expect(images).toHaveLength(3);
    expect(images[0]!.getAttribute('src')).toContain('/a.jpg');
    expect(images[1]!.getAttribute('src')).toContain('/a.jpg');
    expect(images[2]!.getAttribute('src')).toContain('/b.jpg');
  });

  it('puts the winners before the other movies in the fan', () => {
    expect(
      upcomingCardPosters({
        ...base,
        winnerMovies: [{ title: 'Orbite basse', posterPath: '/b.jpg' }],
      }).map((movie) => movie.title)
    ).toEqual(['Orbite basse', 'Le Dernier Projectionniste', 'Minuit à Kyoto']);
  });

  it('asks the viewer to vote when there is no winner yet and no vote of theirs', () => {
    renderCard({ ...base, hasVoted: false });

    expect(screen.getByText('À vous de voter')).toBeInTheDocument();
    expect(screen.queryByText('Commence dans')).not.toBeInTheDocument();
  });

  it('asks for the first movie and shows an empty slot when nothing is proposed', () => {
    renderCard({ ...base, movieCount: 0, topMovies: [], hasVoted: false });

    expect(screen.getByText('Proposez le premier film')).toBeInTheDocument();
    expect(screen.getByText('6 participants')).toBeInTheDocument();
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });

  it('does not ask to vote once the movie is chosen', () => {
    renderCard({
      ...base,
      hasVoted: false,
      winnerMovies: [{ title: 'Orbite basse', posterPath: '/b.jpg' }],
    });

    expect(screen.queryByText('À vous de voter')).not.toBeInTheDocument();
  });

  it('shows a night in progress as such', () => {
    renderCard({ ...base, lifecycle: 'live', hasVoted: false });

    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.queryByText('À vous de voter')).not.toBeInTheDocument();
  });

  it('keeps the leave menu outside the link', async () => {
    const onLeave = vi.fn();
    renderCard(base, onLeave);

    const menu = screen.getByRole('button', { name: 'Options pour Soirée chez Léa' });
    expect(screen.getByRole('link', { name: /Soirée chez Léa/ })).not.toContainElement(menu);
    await userEvent.setup().click(menu);
    await userEvent.setup().click(screen.getByRole('menuitem', { name: /quitter/i }));

    expect(onLeave).toHaveBeenCalledOnce();
  });
});

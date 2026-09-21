import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import RatingNotes from '@/features/events/components/RatingNotes';
import type { ParticipantRating } from '@/features/events/components/MovieRatingDialog';

const rows: ParticipantRating[] = [
  { participantId: 'me', pseudo: 'Sofia', avatarId: null, value: null, isSelf: true },
  {
    participantId: 'p1',
    pseudo: 'Claire',
    avatarId: 'alpha',
    value: 9,
    isSelf: false,
    handle: 'claire',
    isCreator: true,
  },
  { participantId: 'p2', pseudo: 'Marius', avatarId: null, value: 10, isSelf: false },
  { participantId: 'p3', pseudo: 'Yanis', avatarId: null, value: null, isSelf: false },
];

function renderNotes(props: Partial<Parameters<typeof RatingNotes>[0]> = {}) {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <RatingNotes participants={rows} scale="five" {...props} />
      </LocaleProvider>
    </MemoryRouter>
  );
}

describe('RatingNotes', () => {
  it('lists every participant with their rating or a pending mention, plus the average', () => {
    renderNotes();

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Vous');
    expect(items[0]).toHaveTextContent('Pas encore noté');
    expect(items[1]).toHaveTextContent('Claire');
    expect(items[1]).toHaveTextContent('4,5/5');
    expect(items[3]).toHaveTextContent('Pas encore noté');
    expect(screen.getByText('Moyenne 4,8/5')).toBeInTheDocument();
  });

  it('links a participant with a public profile and marks the host', () => {
    renderNotes();

    expect(screen.getByRole('link', { name: 'Claire' })).toHaveAttribute('href', '/u/claire');
    expect(screen.queryByRole('link', { name: 'Marius' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'hôte' })).toBeInTheDocument();
  });

  it('puts the given action on my own row instead of the pending mention', () => {
    renderNotes({ selfAction: <a href="/e/soiree?rate">Noter</a> });

    const items = screen.getAllByRole('listitem');
    expect(within(items[0]!).getByRole('link', { name: 'Noter' })).toBeInTheDocument();
    expect(items[0]).not.toHaveTextContent('Pas encore noté');
    expect(items[3]).toHaveTextContent('Pas encore noté');
  });

  it('keeps my own rating on my row even when an action is given', () => {
    renderNotes({
      participants: [{ ...rows[0]!, value: 7 }, rows[1]!],
      selfAction: <a href="/e/soiree?rate">Noter</a>,
    });

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('3,5/5');
    expect(screen.queryByRole('link', { name: 'Noter' })).not.toBeInTheDocument();
  });

  it('says so when nobody rated yet', () => {
    renderNotes({ participants: rows.map((row) => ({ ...row, value: null })) });

    expect(screen.getByText("Personne n'a encore noté ce film.")).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/Moyenne/)).not.toBeInTheDocument();
  });

  it('keeps everyone listed as pending when asked to always list', () => {
    renderNotes({
      participants: rows.map((row) => ({ ...row, value: null })),
      alwaysList: true,
      selfAction: <a href="/e/soiree?rate">Noter</a>,
    });

    expect(screen.queryByText("Personne n'a encore noté ce film.")).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Noter' })).toBeInTheDocument();
    expect(screen.getAllByText('Pas encore noté')).toHaveLength(3);
  });
});

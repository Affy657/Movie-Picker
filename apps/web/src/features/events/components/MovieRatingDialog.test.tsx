import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import MovieRatingDialog, {
  type ParticipantRating,
} from '@/features/events/components/MovieRatingDialog';

const movie = { title: 'The Matrix', year: '1999', posterPath: null };

const rows: ParticipantRating[] = [
  { participantId: 'me', pseudo: 'Vous', avatarId: null, value: null, isSelf: true },
  { participantId: 'p1', pseudo: 'Alice test', avatarId: 'alpha', value: 8, isSelf: false },
  { participantId: 'p2', pseudo: 'Bob', avatarId: null, value: 9, isSelf: false },
  { participantId: 'p3', pseudo: 'Dev invité', avatarId: null, value: null, isSelf: false },
];

function renderDialog(props: Partial<Parameters<typeof MovieRatingDialog>[0]> = {}) {
  const onSave = vi.fn();
  const onClear = vi.fn();
  render(
    <LocaleProvider>
      <MovieRatingDialog
        open
        onClose={vi.fn()}
        movie={movie}
        mine={null}
        participants={rows}
        scale="five"
        canRate
        saving={false}
        error={null}
        onSave={onSave}
        onClear={onClear}
        {...props}
      />
    </LocaleProvider>
  );
  return { onSave, onClear };
}

describe('MovieRatingDialog', () => {
  it('invites a participant who has not rated yet, with Save disabled until a star is picked', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Noter ce film' })).toBeInTheDocument();
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Votre note' })).toBeInTheDocument();
    expect(screen.getByText('Touchez une étoile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Effacer ma note' })).not.toBeInTheDocument();
  });

  it('shows the picked value in the reader scale and saves it out of 10', async () => {
    const { onSave } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Noter 4 étoiles' }));
    expect(screen.getByRole('status')).toHaveTextContent('4/5');

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSave).toHaveBeenCalledWith(8);
  });

  it('shows an existing rating and lets it be cleared', async () => {
    const { onClear } = renderDialog({
      mine: 7,
      participants: rows.map((r) => (r.isSelf ? { ...r, value: 7 } : r)),
    });

    expect(screen.getByRole('status')).toHaveTextContent('3,5/5');
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Effacer ma note' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('lists every participant with their rating or a pending mention, plus the average', () => {
    renderDialog();

    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    const expected: [string, string][] = [
      ['Vous', 'Pas encore noté'],
      ['Alice test', '4/5'],
      ['Bob', '4,5/5'],
      ['Dev invité', 'Pas encore noté'],
    ];
    expect(items).toHaveLength(expected.length);
    expected.forEach(([name, value], index) => {
      expect(within(items[index]!).getByText(name)).toBeInTheDocument();
      expect(within(items[index]!).getByText(value)).toBeInTheDocument();
    });
    expect(screen.getByText('Moyenne 4,3/5')).toBeInTheDocument();
  });

  it('reads the ten scale', () => {
    renderDialog({
      scale: 'ten',
      mine: 7,
      participants: rows.map((r) => (r.isSelf ? { ...r, value: 7 } : r)),
    });

    expect(screen.getByRole('status')).toHaveTextContent('7/10');
    expect(screen.getByText('Moyenne 8,0/10')).toBeInTheDocument();
  });

  it('is read-only for a visitor: no stars, no footer, the list only', () => {
    renderDialog({ canRate: false });

    expect(screen.getByRole('dialog', { name: 'Les notes de la soirée' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Votre note' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('says so when nobody rated yet', () => {
    renderDialog({ participants: rows.map((r) => ({ ...r, value: null })) });

    expect(screen.getByText("Personne n'a encore noté ce film.")).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('surfaces a save error and keeps the dialog open', () => {
    renderDialog({ error: 'Votre note n’a pas été enregistrée. Réessayez.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Réessayez');
  });

  it('speaks English when the locale says so', () => {
    localStorage.setItem('moviepicker-locale', 'en');
    renderDialog({ mine: 7, participants: rows.map((r) => (r.isSelf ? { ...r, value: 7 } : r)) });

    expect(screen.getByRole('dialog', { name: 'Rate this movie' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('3.5/5');
    expect(screen.getByText('Not rated yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear my rating' })).toBeInTheDocument();
  });
});

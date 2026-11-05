import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import MovieRatingDialog from '@/features/events/components/MovieRatingDialog';

const movie = { title: 'The Matrix', year: '1999', runtimeMinutes: 136, posterPath: null };

function renderDialog(props: Partial<Parameters<typeof MovieRatingDialog>[0]> = {}) {
  const onSave = vi.fn().mockResolvedValue(true);
  const onClear = vi.fn().mockResolvedValue(true);
  const onClose = vi.fn();
  render(
    <LocaleProvider>
      <MovieRatingDialog
        open
        onClose={onClose}
        movie={movie}
        mine={null}
        scale="five"
        error={null}
        onSave={onSave}
        onClear={onClear}
        {...props}
      />
    </LocaleProvider>
  );
  return { onSave, onClear, onClose };
}

const star = (count: number) =>
  screen.getByRole('button', { name: `Noter ${count} étoile${count > 1 ? 's' : ''}` });

describe('MovieRatingDialog', () => {
  it('asks for a star and offers to come back later when nothing is rated', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'The Matrix' })).toBeInTheDocument();
    expect(screen.getByText('Choisissez une étoile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plus tard' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Effacer' })).not.toBeInTheDocument();
  });

  it('saves as soon as a star is picked, without a save button', async () => {
    const { onSave } = renderDialog();

    await userEvent.click(star(4));

    expect(onSave).toHaveBeenCalledWith(8);
    expect(await screen.findByRole('status')).toHaveTextContent('Enregistré');
    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
  });

  it('keeps only the last pick while a save is running', async () => {
    let finishFirst: (ok: boolean) => void = () => {};
    const onSave = vi
      .fn()
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => (finishFirst = resolve)))
      .mockResolvedValue(true);
    renderDialog({ onSave });

    await userEvent.click(star(2));
    await userEvent.click(star(3));
    await userEvent.click(star(5));
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => finishFirst(true));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave).toHaveBeenLastCalledWith(10);
  });

  it('keeps the pick and offers to retry when the save fails', async () => {
    const onSave = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    renderDialog({ onSave, error: "Votre note n'a pas été enregistrée. Réessayez." });

    await userEvent.click(star(4));

    expect(await screen.findByRole('alert')).toHaveTextContent('Réessayez');
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave).toHaveBeenLastCalledWith(8);
  });

  it('shows the rating already given and lets it be cleared', async () => {
    const { onClear } = renderDialog({ mine: 7 });

    expect(screen.getByText('3,5/5')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Effacer' }));

    expect(onClear).toHaveBeenCalled();
    expect(await screen.findByText('Choisissez une étoile')).toBeInTheDocument();
  });

  it('keeps the way out shut until the pick is saved, so a failure is never missed', async () => {
    let finish: (saved: boolean) => void = () => {};
    const onSave = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        })
    );
    renderDialog({ onSave });

    await userEvent.click(star(4));

    expect(screen.getByRole('button', { name: 'Voir les notes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Effacer' })).toBeDisabled();

    await act(async () => finish(true));

    expect(screen.getByRole('button', { name: 'Voir les notes' })).toBeEnabled();
  });

  it('says when the rating could not be cleared and retries the clearing, not the save', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const onClear = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    renderDialog({
      mine: 7,
      onSave,
      onClear,
      error: "Votre note n'a pas été effacée. Réessayez.",
    });

    await userEvent.click(screen.getByRole('button', { name: 'Effacer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Réessayez');
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitFor(() => expect(onClear).toHaveBeenCalledTimes(2));
    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText('Choisissez une étoile')).toBeInTheDocument();
  });

  it('hands the pick to the next movie without waiting for the page to catch up', async () => {
    const onNext = vi.fn();
    renderDialog({ onNext });

    await userEvent.click(star(4));
    await userEvent.click(await screen.findByRole('button', { name: 'Film suivant' }));

    expect(onNext).toHaveBeenCalledWith(8);
  });

  it('closes on the ratings of the night once rated, with no other movie to rate', async () => {
    const { onClose } = renderDialog({ mine: 8 });

    await userEvent.click(screen.getByRole('button', { name: 'Voir les notes' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('moves on to the next movie when another one is left to rate', async () => {
    const onNext = vi.fn();
    renderDialog({ mine: 8, onNext });

    await userEvent.click(screen.getByRole('button', { name: 'Film suivant' }));

    expect(onNext).toHaveBeenCalled();
  });

  it('skips to the next movie instead of closing while nothing is rated', async () => {
    const onNext = vi.fn();
    renderDialog({ onNext });

    await userEvent.click(screen.getByRole('button', { name: 'Passer ce film' }));

    expect(onNext).toHaveBeenCalled();
  });

  it('says where it stands among several movies and recalls the last saved one', () => {
    renderDialog({
      position: { index: 2, total: 3 },
      previous: { title: 'Dune', value: 8 },
    });

    expect(screen.getByText('Film 2 sur 3')).toBeInTheDocument();
    expect(screen.getByText('Dune : 4/5 enregistré')).toBeInTheDocument();
  });

  it('shows the value on the ten scale of the user', () => {
    renderDialog({ mine: 7, scale: 'ten' });

    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('explains the half star in words that suit a mouse and a finger alike', () => {
    renderDialog();
    expect(screen.getByText('Choisissez une étoile')).toBeInTheDocument();
    expect(
      screen.getByText('La moitié gauche d’une étoile vaut une demi-étoile.')
    ).toBeInTheDocument();
  });
});

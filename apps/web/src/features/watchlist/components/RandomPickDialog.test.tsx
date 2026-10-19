import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import type { WatchlistEntry } from '@/features/watchlist/hooks/useWatchlistToolbar';
import RandomPickDialog from './RandomPickDialog';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function film(tmdbId: number, title: string, extra: Partial<WatchlistEntry> = {}): WatchlistEntry {
  return {
    tmdbId,
    mediaType: 'movie',
    title,
    year: '1988',
    posterPath: null,
    voteAverage: 7.4,
    runtimeMinutes: 98,
    createdAt: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

const BEETLEJUICE = film(1, 'Beetlejuice');
const NOPE = film(2, 'Nope', { year: '2022', voteAverage: 6.8, runtimeMinutes: 130 });
const WHIPLASH = film(3, 'Whiplash', { year: '2014', voteAverage: 8.4, runtimeMinutes: 107 });

function renderDialog(props: Partial<Parameters<typeof RandomPickDialog>[0]> = {}) {
  const handlers = { onClose: vi.fn(), onPropose: vi.fn(), onOpenDetails: vi.fn() };
  render(
    <LocaleProvider>
      <RandomPickDialog
        items={[BEETLEJUICE, NOPE, WHIPLASH]}
        scope="list"
        ratingScale="ten"
        pickIndex={() => 0}
        {...handlers}
        {...props}
      />
    </LocaleProvider>
  );
  return handlers;
}

function drawnHeading(title: string) {
  return screen.getByRole('heading', { name: title, level: 3 });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('RandomPickDialog, reduced motion', () => {
  beforeEach(() => stubMatchMedia((query) => query === REDUCED_MOTION));

  it('shows the drawn title at once with its year, rating and runtime', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: 'Piocher un titre' });
    expect(within(dialog).getByRole('heading', { name: 'Beetlejuice', level: 3 })).toBeVisible();
    expect(dialog).toHaveTextContent('1988');
    expect(dialog).toHaveTextContent('7.4/10');
    expect(dialog).toHaveTextContent('1h38');
    expect(within(dialog).getByText('Au hasard parmi les 3 titres de votre liste.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Piocher un autre' })).not.toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('names the dialog after a title rather than a movie, since it can draw a series', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Piocher un titre' })).toBeInTheDocument();
  });

  it('marks a drawn series as one, so it is not proposed to a night that refuses series', () => {
    renderDialog({ items: [film(9, 'Severance', { mediaType: 'tv' })] });

    expect(within(screen.getByRole('dialog')).getByText('Série')).toBeVisible();
  });

  it('adds no series mark to a movie', () => {
    renderDialog();

    expect(within(screen.getByRole('dialog')).queryByText('Série')).not.toBeInTheDocument();
  });

  it('announces the drawn title to screen readers once the live region is in place', async () => {
    renderDialog();

    const region = screen.getByRole('dialog').querySelector('[aria-live="polite"]');
    expect(region).toHaveTextContent(/^$/);
    expect(await screen.findByText('Tiré au hasard : Beetlejuice')).toBe(region);
  });

  it('announces the only title of a list too, though nothing shuffles', async () => {
    renderDialog({ items: [WHIPLASH] });

    const region = screen.getByRole('dialog').querySelector('[aria-live="polite"]');
    expect(region).toHaveTextContent(/^$/);
    expect(await screen.findByText('Tiré au hasard : Whiplash')).toBe(region);
  });

  it('draws a title not seen yet with Piocher un autre', async () => {
    renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Piocher un autre' }));

    expect(drawnHeading('Nope')).toBeInTheDocument();
  });

  it('leaves out the rating and the runtime when they are unknown', () => {
    renderDialog({
      items: [film(9, 'Sans infos', { voteAverage: null, runtimeMinutes: null }), NOPE],
    });

    const dialog = screen.getByRole('dialog', { name: 'Piocher un titre' });
    expect(within(dialog).getByRole('heading', { name: 'Sans infos', level: 3 })).toBeVisible();
    expect(dialog).not.toHaveTextContent('/10');
    expect(dialog).not.toHaveTextContent(/\dh/);
  });

  it('tells how many titles the selection holds', () => {
    renderDialog({ scope: 'selection' });

    expect(
      screen.getByText('Au hasard parmi les 3 titres de votre sélection.')
    ).toBeInTheDocument();
  });

  it('offers no other draw for the only title of a selection', () => {
    renderDialog({ items: [NOPE], scope: 'selection' });

    expect(drawnHeading('Nope')).toBeInTheDocument();
    expect(screen.getByText('Le seul titre de votre sélection.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Piocher un autre' })).not.toBeInTheDocument();
  });

  it('hands the drawn title over to the proposal and to its details', async () => {
    const { onPropose, onOpenDetails } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Proposer dans une soirée' }));
    await userEvent.click(screen.getByRole('button', { name: 'Voir les détails' }));

    expect(onPropose).toHaveBeenCalledExactlyOnceWith(BEETLEJUICE);
    expect(onOpenDetails).toHaveBeenCalledExactlyOnceWith(BEETLEJUICE);
  });

  it('closes from its close button', async () => {
    const { onClose } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe('RandomPickDialog, with motion', () => {
  beforeEach(() => {
    stubMatchMedia(false);
    vi.useFakeTimers();
  });

  it('keeps the title and the actions back while the posters shuffle, then lands', () => {
    const { onPropose } = renderDialog();

    const propose = screen.getByRole('button', { name: 'Proposer dans une soirée' });
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
    expect(propose).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Piocher un autre' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.queryByText(/Tiré au hasard/)).not.toBeInTheDocument();

    act(() => propose.click());
    expect(onPropose).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(2000));

    expect(drawnHeading('Beetlejuice')).toBeInTheDocument();
    expect(propose).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Tiré au hasard : Beetlejuice')).toBeInTheDocument();
  });

  it('keeps the focus on Piocher un autre through the next shuffle', () => {
    renderDialog();
    act(() => vi.advanceTimersByTime(2000));
    const again = screen.getByRole('button', { name: 'Piocher un autre' });

    act(() => {
      again.focus();
      again.click();
    });
    expect(again).toHaveAttribute('aria-disabled', 'true');
    act(() => vi.advanceTimersByTime(2000));

    expect(drawnHeading('Nope')).toBeInTheDocument();
    expect(again).toHaveFocus();
  });

  it('loads the drawn poster while the other posters shuffle', () => {
    const poster = (name: string) => `https://image.tmdb.org/t/p/w500/${name}.jpg`;
    renderDialog({
      items: [
        film(1, 'Beetlejuice', { posterPath: poster('beetlejuice') }),
        film(2, 'Nope', { posterPath: poster('nope') }),
        film(3, 'Whiplash', { posterPath: poster('whiplash') }),
      ],
    });
    act(() => vi.advanceTimersByTime(0));

    const sources = () => [...document.querySelectorAll('img')].map((img) => img.src);
    expect(sources()).toHaveLength(2);
    expect(sources()).toContain('https://image.tmdb.org/t/p/w185/beetlejuice.jpg');
    expect(sources().find((src) => !src.includes('beetlejuice'))).toMatch(/nope|whiplash/);
    expect(document.querySelector('img[hidden]')).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w185/beetlejuice.jpg'
    );

    act(() => vi.advanceTimersByTime(2000));

    expect(sources()).toEqual(['https://image.tmdb.org/t/p/w185/beetlejuice.jpg']);
  });

  it('shows the only title of the list without shuffling', () => {
    renderDialog({ items: [WHIPLASH] });

    expect(drawnHeading('Whiplash')).toBeInTheDocument();
    expect(screen.getByText('Le seul titre de votre liste.')).toBeInTheDocument();
  });
});

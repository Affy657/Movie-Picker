import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CardKebab,
  MovieCardKebab,
  type CardKebabProps,
} from '@/features/movies/components/MovieCardKebab';
import type { MovieData } from '@/shared/types/movie';
import { LocaleProvider, useTranslation } from '@/shared/i18n';
import { stubHoverCapability } from '@/test-utils/matchMedia';

type HarnessProps = Partial<Omit<CardKebabProps, 't'>>;

function Harness(props: Readonly<HarnessProps>) {
  const { t } = useTranslation();
  return (
    <CardKebab
      title="Dune"
      tmdbId={438631}
      mediaType="movie"
      isMine
      isHost={false}
      canRemove={false}
      onRemove={() => {}}
      t={t}
      {...props}
    />
  );
}

function renderKebab(props: HarnessProps = {}) {
  render(
    <LocaleProvider>
      <Harness {...props} />
    </LocaleProvider>
  );
}

async function openKebab(props: HarnessProps = {}) {
  const user = userEvent.setup();
  renderKebab(props);
  await user.click(screen.getByRole('button', { name: /plus d’actions/i }));
  return user;
}

const menuItemNames = () =>
  screen
    .getAllByRole('menuitem')
    .map((item) => item.getAttribute('aria-label') ?? item.textContent);

describe('CardKebab', () => {
  it('offers only the Letterboxd link among the external links', async () => {
    await openKebab({ onViewDetails: () => {}, canRemove: true });

    const letterboxd = screen.getByRole('menuitem', { name: /letterboxd/i });
    expect(letterboxd).toHaveAttribute('href', 'https://letterboxd.com/tmdb/438631/');
    expect(screen.queryByRole('menuitem', { name: /imdb|allociné|tmdb/i })).toBeNull();
  });

  it('lists the items in the unified order', async () => {
    await openKebab({
      onViewDetails: () => {},
      onToggleWatchlist: () => {},
      inWatchlist: false,
      onProposeToEvent: () => {},
      wheelExclusion: { excluded: false, onToggle: () => {} },
      canRemove: true,
    });

    expect(menuItemNames()).toEqual([
      'Voir les détails',
      'Ajouter à ma liste',
      'Proposer dans une soirée',
      'Exclure du tirage',
      'Ouvrir sur Letterboxd',
      'Retirer Dune',
    ]);
    expect(screen.getAllByRole('separator')).toHaveLength(2);
  });

  it('flips the toggle labels with the state', async () => {
    await openKebab({
      onToggleWatchlist: () => {},
      inWatchlist: true,
      wheelExclusion: { excluded: true, onToggle: () => {} },
    });

    expect(screen.getByRole('menuitem', { name: 'Retirer de ma liste' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Réintégrer au tirage' })).toBeInTheDocument();
  });

  it('is a shared menu: the arrows walk the items, Escape closes and gives the focus back', async () => {
    const user = await openKebab({ onViewDetails: () => {}, canRemove: true });
    const menu = screen.getByRole('menu', { name: /plus d’actions/i });
    const items = screen.getAllByRole('menuitem');
    expect(menu).toContainElement(items[0]!);

    items[0]!.focus();
    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
    await user.keyboard('{End}');
    expect(items[items.length - 1]).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plus d’actions/i })).toHaveFocus();
  });

  it('is not rendered when only the Letterboxd link would remain', () => {
    renderKebab();
    expect(screen.queryByRole('button', { name: /plus d’actions/i })).toBeNull();
  });

  it('is rendered as soon as the details are available', () => {
    renderKebab({ onViewDetails: () => {} });
    expect(screen.getByRole('button', { name: /plus d’actions/i })).toBeInTheDocument();
  });

  it('is not rendered when the details cannot open and nothing else is offered', () => {
    renderKebab({ onViewDetails: () => {}, tmdbId: 0 });
    expect(screen.queryByRole('button', { name: /plus d’actions/i })).toBeNull();
  });

  it('keeps the trigger expanded while its menu is open', async () => {
    await openKebab({ onViewDetails: () => {} });
    expect(screen.getByRole('button', { name: /plus d’actions/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('gives the focus back to the trigger when a keyboard-picked action opens no dialog', async () => {
    const onToggleWatchlist = vi.fn();
    const user = await openKebab({ onToggleWatchlist, inWatchlist: false });

    screen.getByRole('menuitem', { name: 'Ajouter à ma liste' }).focus();
    await user.keyboard('{Enter}');

    expect(onToggleWatchlist).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /plus d’actions/i }));
  });

  it('closes the menu before running an action', async () => {
    const onViewDetails = vi.fn();
    const user = await openKebab({ onViewDetails });

    await user.click(screen.getByRole('menuitem', { name: 'Voir les détails' }));

    expect(onViewDetails).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

const eventMovie: MovieData = {
  id: 'm1',
  eventId: 'e1',
  participantId: 'p1',
  tmdbId: 27205,
  title: 'Inception',
  year: '2010',
  posterPath: null,
  proposerPseudo: 'Alice',
  score: 0,
  up: 0,
  down: 0,
};

function EventHarness({
  movie = eventMovie,
  hasDetails = true,
  onToggleWatchlist,
}: Readonly<{
  movie?: MovieData;
  hasDetails?: boolean;
  onToggleWatchlist?: (movie: MovieData) => void;
}>) {
  const { t } = useTranslation();
  return (
    <MovieCardKebab
      movie={movie}
      card={{ isMine: true, canRemove: true, hasDetails, openDetails: () => {} }}
      slotClassName="slot"
      isHost={false}
      onRemove={() => {}}
      onToggleWatchlist={onToggleWatchlist}
      t={t}
    />
  );
}

describe('MovieCardKebab (event adapter, hover gate)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mounts nothing on a device without hover: the details modal carries the actions', () => {
    render(
      <LocaleProvider>
        <EventHarness onToggleWatchlist={() => {}} />
      </LocaleProvider>
    );
    expect(screen.queryByRole('button', { name: /plus d’actions/i })).toBeNull();
  });

  it('mounts the kebab on a hover-capable device', () => {
    stubHoverCapability();
    render(
      <LocaleProvider>
        <EventHarness onToggleWatchlist={() => {}} />
      </LocaleProvider>
    );
    expect(
      screen.getByRole('button', { name: /plus d’actions pour «\s*inception\s*»/i })
    ).toBeInTheDocument();
  });

  it('keeps the kebab without hover when the details cannot open the actions', () => {
    render(
      <LocaleProvider>
        <EventHarness movie={{ ...eventMovie, tmdbId: 0 }} hasDetails={false} />
      </LocaleProvider>
    );
    expect(screen.getByRole('button', { name: /plus d’actions/i })).toBeInTheDocument();
  });

  it('mounts nothing when the event card offers no action at all', () => {
    stubHoverCapability();
    render(
      <LocaleProvider>
        <MovieCardKebabWithoutActions />
      </LocaleProvider>
    );
    expect(screen.queryByRole('button', { name: /plus d’actions/i })).toBeNull();
  });
});

function MovieCardKebabWithoutActions() {
  const { t } = useTranslation();
  return (
    <MovieCardKebab
      movie={{ ...eventMovie, tmdbId: 0 }}
      card={{ isMine: false, canRemove: false, hasDetails: false, openDetails: () => {} }}
      slotClassName="slot"
      isHost={false}
      onRemove={() => {}}
      t={t}
    />
  );
}

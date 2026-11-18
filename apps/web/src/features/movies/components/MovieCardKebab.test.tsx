import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

const REMOVE = { label: 'Retirer', ariaLabel: 'Retirer Dune', onSelect: () => {} };

function Harness(props: Readonly<HarnessProps>) {
  const { t } = useTranslation();
  return <CardKebab title="Dune" tmdbId={438631} mediaType="movie" t={t} {...props} />;
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
  it('closes when Tab leaves the menu, with the focus where Tab took it', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <Harness onViewDetails={() => {}} />
        <button type="button">Plus loin</button>
      </LocaleProvider>
    );
    await user.click(screen.getByRole('button', { name: /plus d’actions/i }));
    screen.getAllByRole('menuitem')[0]?.focus();

    await user.tab({ shift: true });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plus loin' })).toHaveFocus();
  });

  it('offers only the Letterboxd link among the external links', async () => {
    await openKebab({ onViewDetails: () => {}, remove: REMOVE });

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
      remove: REMOVE,
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
    const user = await openKebab({ onViewDetails: () => {}, remove: REMOVE });
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

  it('stays open on a press in its portaled panel and closes on a press elsewhere', async () => {
    await openKebab({ onViewDetails: () => {} });

    fireEvent.mouseDown(screen.getByRole('menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('points its trigger at the open panel', async () => {
    renderKebab({ onViewDetails: () => {} });
    const trigger = screen.getByRole('button', { name: /plus d’actions/i });
    expect(trigger).not.toHaveAttribute('aria-controls');

    await userEvent.setup().click(trigger);

    const menu = screen.getByRole('menu', { name: /plus d’actions/i });
    expect(menu.id).not.toBe('');
    expect(trigger).toHaveAttribute('aria-controls', menu.id);
  });

  it('says which actions open a dialog', async () => {
    await openKebab({
      onViewDetails: () => {},
      onToggleWatchlist: () => {},
      onProposeToEvent: () => {},
      remove: {
        label: 'Retirer',
        ariaLabel: 'Retirer Dune',
        opensDialog: true,
        onSelect: () => {},
      },
    });

    expect(screen.getByRole('menuitem', { name: 'Proposer dans une soirée' })).toHaveAttribute(
      'aria-haspopup',
      'dialog'
    );
    expect(screen.getByRole('menuitem', { name: 'Retirer Dune' })).toHaveAttribute(
      'aria-haspopup',
      'dialog'
    );
    expect(screen.getByRole('menuitem', { name: 'Voir les détails' })).not.toHaveAttribute(
      'aria-haspopup'
    );
    expect(screen.getByRole('menuitem', { name: 'Ajouter à ma liste' })).not.toHaveAttribute(
      'aria-haspopup'
    );
  });

  it('removes without announcing a dialog when the removal asks for no confirmation', async () => {
    await openKebab({
      remove: { label: 'Retirer', ariaLabel: 'Retirer Dune', onSelect: () => {} },
    });

    expect(screen.getByRole('menuitem', { name: 'Retirer Dune' })).not.toHaveAttribute(
      'aria-haspopup'
    );
  });

  describe('while the page scrolls', () => {
    afterEach(() => {
      Reflect.deleteProperty(document, 'elementFromPoint');
    });

    function stubHitTest(hit: () => Element | null) {
      Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hit });
    }

    it('closes once its trigger is hidden, under a bar or out of the screen', async () => {
      await openKebab({ onViewDetails: () => {} });
      const header = document.createElement('header');
      document.body.append(header);
      stubHitTest(() => header);

      fireEvent.scroll(window);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      header.remove();
    });

    it('stays open and follows its trigger while the trigger is still in sight', async () => {
      await openKebab({ onViewDetails: () => {} });
      stubHitTest(() => screen.getByRole('button', { name: /plus d’actions/i }));

      fireEvent.scroll(window);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('draws the remove action with the labels its context gives', async () => {
    const onSelect = vi.fn();
    const user = await openKebab({
      remove: {
        label: 'Retirer de la liste',
        ariaLabel: 'Retirer « Dune » de la liste',
        title: 'Vous retirez ce film pour tout le monde',
        onSelect,
      },
    });

    const item = screen.getByRole('menuitem', { name: 'Retirer « Dune » de la liste' });
    expect(item).toHaveTextContent('Retirer de la liste');
    expect(item).toHaveAttribute('title', 'Vous retirez ce film pour tout le monde');
    await user.click(item);
    expect(onSelect).toHaveBeenCalledTimes(1);
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
      card={{ hasDetails, openDetails: () => {} }}
      slotClassName="slot"
      remove={{
        label: 'Retirer',
        ariaLabel: `Retirer ${movie.title}`,
        opensDialog: true,
        onSelect: () => {},
      }}
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

  it('announces the confirmation that the removal of a film from the night opens', async () => {
    stubHoverCapability();
    render(
      <LocaleProvider>
        <EventHarness onToggleWatchlist={() => {}} />
      </LocaleProvider>
    );

    await userEvent.setup().click(screen.getByRole('button', { name: /plus d’actions/i }));

    expect(screen.getByRole('menuitem', { name: /retirer inception/i })).toHaveAttribute(
      'aria-haspopup',
      'dialog'
    );
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
      card={{ hasDetails: false, openDetails: () => {} }}
      slotClassName="slot"
      t={t}
    />
  );
}

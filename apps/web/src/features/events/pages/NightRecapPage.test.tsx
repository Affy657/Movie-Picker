import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import NightRecapPage from '@/features/events/pages/NightRecapPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1, authMeGuestHandler } from '@/mocks/handlers';
import { setSessionHint } from '@/features/auth/session-hint';

const slug = 'recap-msw';
const ME = {
  userId: 'u-sofia',
  displayName: 'Sofia',
  emailMasked: 's***@test.local',
  uiTheme: 'light',
  accentColor: 'default',
  handle: 'sofia',
  bio: null,
  isProfilePublic: true,
  avatarId: 'alpha',
  ratingScale: 'ten',
};

type NightOptions = {
  winners?: string[];
  isFinished?: boolean;
  myParticipantId?: string | null;
  ratings?: Record<string, Array<{ participantId: string; value: number }>>;
  theme?: string | null;
};

function nightPayload(options: NightOptions) {
  return {
    _id: 'evt-recap',
    title: 'Soirée du vendredi',
    date: '2026-09-18',
    time: '20:30',
    slug,
    isHost: false,
    isFinished: options.isFinished ?? true,
    lifecycle: options.isFinished === false ? 'live' : 'finished',
    winners: (options.winners ?? ['m-heat']).map((movieId) => ({
      movieId,
      pickMethod: 'wheel',
      pickedAt: '2026-09-18T19:00:00Z',
    })),
    participantCount: 4,
    movieCount: 12,
    myParticipant: options.myParticipantId
      ? { _id: options.myParticipantId, pseudo: 'Sofia' }
      : null,
    participants: [
      { _id: 'p-claire', pseudo: 'Claire', isCreator: true, avatarId: 'alpha', handle: 'claire' },
      { _id: 'p-marius', pseudo: 'Marius', avatarId: 'beta' },
      { _id: 'p-yanis', pseudo: 'Yanis' },
      { _id: 'p-sofia', pseudo: 'Sofia', avatarId: 'gamma' },
    ],
    config: {
      theme: options.theme ?? 'Thriller des années 90',
      maxProposalsPerParticipant: null,
      maxParticipants: null,
      wheelMode: 'strictRandom',
      winnerCount: 1,
    },
  };
}

function movie(
  id: string,
  title: string,
  year: string,
  ratings: Array<{ participantId: string; value: number }>
) {
  return {
    _id: id,
    eventId: 'evt-recap',
    participantId: 'p-marius',
    tmdbId: 949,
    mediaType: 'movie',
    title,
    year,
    posterPath: null,
    proposerPseudo: 'Marius',
    score: 3,
    up: 3,
    down: 0,
    runtimeMinutes: 170,
    ratings: ratings.map((r) => ({ ...r, updatedAt: '2026-09-19T08:00:00Z' })),
  };
}

const RATED = [
  { participantId: 'p-claire', value: 9 },
  { participantId: 'p-marius', value: 10 },
  { participantId: 'p-yanis', value: 7 },
];

function ratingRows(card: HTMLElement) {
  const notes = within(card).getAllByRole('region', { name: 'Les notes de la soirée' });
  return notes.flatMap((section) => within(section).getAllByRole('listitem'));
}

function renderRecap(path = `/r/${slug}`) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/r/:slug" element={<NightRecapPage />} />
          <Route path="/e/:slug" element={<div data-testid="route-night" />} />
          <Route path="/new" element={<div data-testid="route-new" />} />
          <Route path="/register" element={<div data-testid="route-register" />} />
          <Route path="/u/:handle" element={<div data-testid="route-profile" />} />
          <Route path="/" element={<div data-testid="route-home" />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('NightRecapPage (MSW)', () => {
  const server = setupServer(authMeGuestHandler);

  function serveNight(options: NightOptions = {}) {
    const ratings = options.ratings ?? { 'm-heat': RATED };
    server.use(
      http.get(`${TEST_API_V1}/events/slug/${slug}`, () =>
        HttpResponse.json(nightPayload(options))
      ),
      http.get(`${TEST_API_V1}/events/${slug}/movies`, () =>
        HttpResponse.json([
          movie('m-heat', 'Heat', '1995', ratings['m-heat'] ?? []),
          movie('m-inception', 'Inception', '2010', ratings['m-inception'] ?? []),
          movie('m-other', 'Collateral', '2004', []),
        ])
      )
    );
  }

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });
  afterEach(() => {
    server.resetHandlers();
    sessionStorage.clear();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('shows a visitor the night, its chosen movie, the average and every participant with their rating', async () => {
    serveNight();

    renderRecap();

    expect(await screen.findByRole('heading', { name: 'Soirée du vendredi' })).toBeInTheDocument();
    expect(screen.getByText('Le recap de la soirée')).toBeInTheDocument();
    expect(screen.getByText(/vendredi 18 septembre 2026/)).toBeInTheDocument();
    expect(screen.getByText('4 participants')).toBeInTheDocument();
    expect(screen.getByText('12 films proposés')).toBeInTheDocument();
    expect(screen.getByText('Thriller des années 90')).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Le film de la soirée' });
    expect(within(card).getByText('Heat')).toBeInTheDocument();
    expect(within(card).getByText('1995')).toBeInTheDocument();
    expect(within(card).getByText('2h50')).toBeInTheDocument();
    expect(within(card).getByText('Moyenne 4,3/5')).toBeInTheDocument();
    expect(within(card).getByText('3 notes')).toBeInTheDocument();
    const rows = ratingRows(card);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('Claire');
    expect(rows[0]).toHaveTextContent('4,5/5');
    expect(rows[3]).toHaveTextContent('Sofia');
    expect(rows[3]).toHaveTextContent('Pas encore noté');
    expect(within(card).getByRole('link', { name: 'Claire' })).toHaveAttribute('href', '/u/claire');
    expect(screen.queryByText('Collateral')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Noter/ })).not.toBeInTheDocument();
    expect(document.title).toBe('Soirée du vendredi, le recap | Movie Picker');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain(
      'noindex'
    );
  });

  it('sends a visitor to account creation, then to the night creation', async () => {
    serveNight();
    renderRecap();
    await screen.findByRole('heading', { name: 'Soirée du vendredi' });

    expect(screen.getByRole('link', { name: 'Organise la tienne' })).toHaveAttribute(
      'href',
      `/register?returnTo=${encodeURIComponent('/new')}`
    );
    expect(screen.getByRole('link', { name: 'Voir la soirée' })).toHaveAttribute(
      'href',
      `/e/${slug}`
    );
  });

  it('sends a signed-in reader straight to the night creation', async () => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME)));
    serveNight();
    renderRecap();
    await screen.findByRole('heading', { name: 'Soirée du vendredi' });

    expect(await screen.findByRole('link', { name: 'Organise la tienne' })).toHaveAttribute(
      'href',
      '/new'
    );
  });

  it('lets a participant who has not rated jump to the rating of that movie, in their own scale', async () => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME)));
    serveNight({ myParticipantId: 'p-sofia' });
    renderRecap();

    const card = await screen.findByRole('region', { name: 'Le film de la soirée' });
    const rate = await within(card).findByRole('link', { name: 'Noter' });
    expect(rate).toHaveAttribute('href', `/e/${slug}?rate=m-heat`);
    const rows = ratingRows(card);
    expect(rows[0]).toHaveTextContent('Vous');
    expect(within(card).getByText('Moyenne 8,7/10')).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('9/10');
  });

  it('shows no rating action to a participant who already rated', async () => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME)));
    serveNight({
      myParticipantId: 'p-sofia',
      ratings: { 'm-heat': [...RATED, { participantId: 'p-sofia', value: 6 }] },
    });
    renderRecap();

    const card = await screen.findByRole('region', { name: 'Le film de la soirée' });
    await within(card).findByText('Moyenne 8,0/10');
    expect(within(card).queryByRole('link', { name: 'Noter' })).not.toBeInTheDocument();
    expect(ratingRows(card)[0]).toHaveTextContent('6/10');
  });

  it('shows one card per chosen movie, in draw order, each with its own ratings', async () => {
    serveNight({
      winners: ['m-inception', 'm-heat'],
      ratings: { 'm-inception': [{ participantId: 'p-claire', value: 10 }], 'm-heat': [] },
    });
    renderRecap();

    const card = await screen.findByRole('region', { name: 'Les 2 films de la soirée' });
    const titles = within(card)
      .getAllByText(/^(Inception|Heat)$/)
      .map((element) => element.textContent);
    expect(titles).toEqual(['Inception', 'Heat']);
    expect(within(card).getByText('Moyenne 5,0/5')).toBeInTheDocument();
    expect(within(card).getAllByText('Pas encore noté')).toHaveLength(7);
  });

  it('shares the story of the night from the recap page', async () => {
    serveNight({
      winners: ['m-inception', 'm-heat'],
      ratings: { 'm-inception': [{ participantId: 'p-claire', value: 10 }], 'm-heat': [] },
    });
    renderRecap();

    await screen.findByRole('region', { name: 'Les 2 films de la soirée' });
    await userEvent.click(screen.getByRole('button', { name: 'Partager' }));

    const dialog = await screen.findByRole('dialog', { name: 'Partager le recap' });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Story' }));

    expect(within(dialog).getByRole('radio', { name: 'Les films' })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: 'Un film' })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Les notes' })).toBeInTheDocument();
  });

  it('waits for the movie when none is chosen yet', async () => {
    serveNight({ winners: [], isFinished: false });
    renderRecap();

    expect(await screen.findByText("Le film n'est pas encore choisi")).toBeInTheDocument();
    expect(screen.getByText(/arrive après la soirée/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la soirée' })).toHaveAttribute(
      'href',
      `/e/${slug}`
    );
    expect(screen.queryByRole('link', { name: 'Organise la tienne' })).not.toBeInTheDocument();
  });

  it('says so when the night ended without a movie', async () => {
    serveNight({ winners: [], isFinished: true });
    renderRecap();

    expect(await screen.findByText('Terminée sans film')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la soirée' })).toHaveAttribute(
      'href',
      `/e/${slug}`
    );
  });

  it('tells an unknown link apart and sends home', async () => {
    server.use(
      http.get(`${TEST_API_V1}/events/slug/${slug}`, () =>
        HttpResponse.json({ error: 'Not found', code: 404, reason: 'not_found' }, { status: 404 })
      )
    );
    renderRecap();

    expect(await screen.findByText('Recap introuvable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/');
  });

  it('offers to retry after a failure, and recovers', async () => {
    let failures = 1;
    server.use(
      http.get(`${TEST_API_V1}/events/slug/${slug}`, () => {
        if (failures-- > 0) return HttpResponse.json({ error: 'boom', code: 500 }, { status: 500 });
        return HttpResponse.json(nightPayload({}));
      }),
      http.get(`${TEST_API_V1}/events/${slug}/movies`, () =>
        HttpResponse.json([movie('m-heat', 'Heat', '1995', RATED)])
      )
    );
    renderRecap();

    expect(await screen.findByText("Le recap n'a pas pu être chargé")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByRole('heading', { name: 'Soirée du vendredi' })).toBeInTheDocument();
  });

  it('speaks English when the locale says so', async () => {
    localStorage.setItem('moviepicker-locale', 'en');
    serveNight();
    renderRecap();

    expect(await screen.findByText('The night recap')).toBeInTheDocument();
    expect(screen.getByText(/Friday, 18 September 2026/)).toBeInTheDocument();
    expect(screen.getByText('12 movies proposed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Host your own' })).toBeInTheDocument();
  });
});

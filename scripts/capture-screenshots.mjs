import { chromium, request } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const WEB = process.env.CAPTURE_WEB_URL ?? 'http://localhost:5173';
const API = process.env.CAPTURE_API_URL ?? 'http://localhost:4000';
const OUT = path.resolve(process.env.CAPTURE_OUT ?? 'docs/screenshots');
const VIEWPORT = { width: 1280, height: 800 };

const HOST = { email: 'dev@test.local', password: 'DevTest123!' };
const GUESTS = [
  { email: 'alice@test.local', password: 'AliceTest123!', pseudo: 'Alice' },
  { email: 'bob@test.local', password: 'BobTest12345!', pseudo: 'Bob' },
  { email: 'carla@test.local', password: 'CarlaTest123!', pseudo: 'Carla' },
];
const PICKS = [
  'Dune',
  'Interstellar',
  'Parasite',
  'Blade Runner 2049',
  'Whiplash',
  'Le Voyage de Chihiro',
];
const WATCHLIST = [
  'Premier contact',
  'La La Land',
  'Portrait de la jeune fille en feu',
  'Everything Everywhere All at Once',
  'Le Prestige',
  'Perfect Days',
  'Past Lives',
  'Drive My Car',
  "Anatomie d'une chute",
  'Les Huit Salopards',
  'Le Grand Budapest Hotel',
  'Mad Max: Fury Road',
];

function eventDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
}

async function login(user) {
  const context = await request.newContext({ baseURL: API });
  const res = await context.post('/api/v1/auth/login', {
    data: { email: user.email, password: user.password },
  });
  if (!res.ok()) throw new Error(`login ${user.email}: ${res.status()}`);
  return context;
}

async function json(promise, label) {
  const res = await promise;
  if (!res.ok()) throw new Error(`${label}: ${res.status()} ${await res.text()}`);
  return res.status() === 204 ? null : res.json();
}

function listOf(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const found = Object.values(payload).find((value) => Array.isArray(value));
  return found ?? [];
}

async function seedWatchlist(host) {
  const existing = listOf(await json(host.get('/api/v1/watchlist'), 'list watchlist'));
  for (const item of existing) {
    if (item.posterPath) continue;
    await host.delete(`/api/v1/watchlist/${item.tmdbId}`);
  }
  for (const query of WATCHLIST) {
    const found = await json(
      host.get(`/api/v1/movies/search?q=${encodeURIComponent(query)}`),
      `search ${query}`
    );
    const movie = listOf(found)[0];
    if (!movie) continue;
    const res = await host.post('/api/v1/watchlist', {
      data: {
        tmdbId: movie.id,
        mediaType: movie.mediaType,
        title: movie.title,
        year: movie.year,
        posterPath: movie.posterPath,
        voteAverage: movie.voteAverage,
        runtimeMinutes: movie.runtimeMinutes,
      },
    });
    if (!res.ok() && res.status() !== 409) {
      throw new Error(`watchlist ${query}: ${res.status()} ${await res.text()}`);
    }
  }
}

async function seedEvent(host) {
  await json(
    host.patch('/api/v1/auth/me', {
      data: {
        displayName: 'Adrien',
        handle: 'adrien',
        bio: 'Soirées ciné entre amis, un vendredi sur deux.',
        uiTheme: 'dark',
        isProfilePublic: true,
        isWatchlistPublic: true,
      },
    }),
    'patch profile'
  );

  const created = await json(
    host.post('/api/v1/events', {
      data: { title: 'Soirée du vendredi', date: eventDate(), time: '20:30' },
    }),
    'create event'
  );
  const slug = created.slug;
  const hostParticipant = created.creatorParticipant._id;

  for (const query of PICKS) {
    const found = await json(
      host.get(`/api/v1/movies/search?q=${encodeURIComponent(query)}`),
      `search ${query}`
    );
    const movie = listOf(found)[0];
    if (!movie) continue;
    await json(
      host.post(`/api/v1/events/${slug}/movies`, {
        data: {
          tmdbId: movie.id,
          mediaType: movie.mediaType,
          title: movie.title,
          year: movie.year,
          posterPath: movie.posterPath,
          participantId: hostParticipant,
        },
      }),
      `add ${query}`
    );
  }

  const movies = listOf(
    await json(
      host.get(`/api/v1/events/${slug}/movies?participantId=${hostParticipant}`),
      'list movies'
    )
  );

  const voters = [{ context: host, participantId: hostParticipant, index: 0 }];
  for (const [index, guest] of GUESTS.entries()) {
    const context = await login(guest);
    const joined = await json(
      context.post(`/api/v1/events/${slug}/join`, { data: { pseudo: guest.pseudo } }),
      `join ${guest.pseudo}`
    );
    voters.push({
      context,
      participantId: joined.participant?._id ?? joined._id,
      index: index + 1,
    });
  }

  for (const voter of voters) {
    for (const [position, movie] of movies.entries()) {
      const value = (position + voter.index) % 5 === 0 ? -1 : 1;
      if ((position + voter.index) % 7 === 3) continue;
      await json(
        voter.context.post(`/api/v1/events/${slug}/movies/${movie._id}/vote`, {
          data: { participantId: voter.participantId, value },
        }),
        `vote ${movie.title}`
      );
    }
  }

  for (const movie of movies.slice(0, 4)) {
    await json(
      host.post(`/api/v1/events/${slug}/movies/${movie._id}/seen`, {
        data: { participantId: hostParticipant },
      }),
      `seen ${movie.title}`
    );
  }

  return { slug, movies: movies.length, participants: voters.length };
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
  await page
    .evaluate(async () => {
      const pending = [...document.images]
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            })
        );
      const deadline = new Promise((resolve) => setTimeout(resolve, 3000));
      await Promise.race([Promise.all(pending), deadline]);
    })
    .catch(() => {});
  await page.waitForTimeout(900);
}

async function dismissOverlays(page) {
  for (const label of [/c.est not/i, /tout refuser/i]) {
    const button = page.getByRole('button', { name: label });
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}

async function loadLazyImages(page) {
  await page.evaluate(async () => {
    const step = Math.round(globalThis.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      globalThis.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    globalThis.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
}

async function shot(page, name, prepare) {
  await settle(page);
  await dismissOverlays(page);
  await loadLazyImages(page);
  if (prepare) await prepare(page);
  await settle(page);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('saved', name);
}

const host = await login(HOST);
await seedWatchlist(host);
const seeded = await seedEvent(host);
console.log('event', seeded.slug, `${seeded.movies} films`, `${seeded.participants} participants`);

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  colorScheme: 'dark',
  locale: 'fr-FR',
  storageState: await host.storageState(),
  reducedMotion: 'reduce',
});
await context.addInitScript(() => {
  localStorage.setItem('moviepicker-consent', JSON.stringify({ decided: true, analytics: false }));
  localStorage.setItem('moviepicker-theme', 'dark');
  localStorage.setItem('moviepicker-locale', 'fr');
  localStorage.setItem('mp.session-hint', '1');
});

const page = await context.newPage();
await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
await shot(page, '01-accueil.png');

await page.goto(`${WEB}/e/${seeded.slug}`, { waitUntil: 'domcontentloaded' });
await shot(page, '02-soiree.png');

await page.getByRole('button', { name: /lancer la roue/i }).click();
await page.waitForTimeout(3000);
await shot(page, '03-tirage.png');

await page.goto(`${WEB}/watchlist`, { waitUntil: 'domcontentloaded' });
await shot(page, '04-ma-liste.png');

await context.close();
await browser.close();
console.log('done');

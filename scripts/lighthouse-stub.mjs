import http from 'node:http';
import zlib from 'node:zlib';

export const STUB_HANDLE = 'lighthouse';
export const STUB_ACTIVE_HANDLE = 'lighthouse-actif';
export const STUB_MOVIE_ID = 1000;

export const STUB_IMAGE_SIZES = {
  w45: { width: 45, height: 45, bytes: 2_300 },
  w92: { width: 92, height: 138, bytes: 4_200 },
  w154: { width: 154, height: 231, bytes: 8_600 },
  w185: { width: 185, height: 278, bytes: 11_200 },
  w342: { width: 342, height: 513, bytes: 28_000 },
  w500: { width: 500, height: 750, bytes: 49_000 },
  w780: { width: 780, height: 439, bytes: 41_000 },
  w1280: { width: 1280, height: 720, bytes: 100_000 },
};

const IMAGE_VARIANTS = 6;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rows) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(rows, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function blockImage({ width, height, cells, seed }) {
  const random = seededRandom(seed);
  const columns = Math.max(1, Math.round(Math.sqrt((cells * width) / height)));
  const lines = Math.max(1, Math.round(cells / columns));
  const hue = random();
  const palette = Array.from({ length: columns * lines }, () => {
    const shade = 0.25 + random() * 0.6;
    return [
      Math.round(255 * shade * (0.5 + hue / 2)),
      Math.round(255 * shade * (1 - hue / 2)),
      Math.round(255 * shade * random()),
    ];
  });
  const stride = width * 3 + 1;
  const rows = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const line = Math.floor((y * lines) / height);
    for (let x = 0; x < width; x++) {
      const color = palette[line * columns + Math.floor((x * columns) / width)];
      rows.set(color, y * stride + 1 + x * 3);
    }
  }
  return encodePng(width, height, rows);
}

function calibratedCells({ width, height, bytes }) {
  let cells = Math.max(1, Math.round(bytes / 3));
  for (let attempt = 0; attempt < 4; attempt++) {
    const size = blockImage({ width, height, cells, seed: 1 }).length;
    if (Math.abs(size - bytes) / bytes < 0.05) break;
    cells = Math.max(1, Math.round((cells * bytes) / size));
  }
  return cells;
}

export function buildImageBank(sizes = STUB_IMAGE_SIZES, variants = IMAGE_VARIANTS) {
  const bank = new Map();
  for (const [name, profile] of Object.entries(sizes)) {
    const cells = calibratedCells(profile);
    bank.set(
      name,
      Array.from({ length: variants }, (_, index) =>
        blockImage({ ...profile, cells, seed: index + 2 })
      )
    );
  }
  return bank;
}

function hashOf(text) {
  let hash = 0;
  for (const char of text) hash = (Math.imul(hash, 31) + char.codePointAt(0)) >>> 0;
  return hash;
}

export function stubImageFor(bank, size, file) {
  const variants = bank.get(size);
  if (!variants) return null;
  return variants[hashOf(file) % variants.length];
}

const relayPoster = (size, name) => `/api/v1/posters/tmdb/${size}/lh-${name}.png`;
const tmdbSourcedPoster = (name) => relayPoster('w154', name);
const relayStoredPoster = (name) => relayPoster('w500', name);

const GENRE_IDS = [28, 18, 35, 53, 27, 878, 12, 16];
const THEMES = ['frissons', 'comedies-francaises', 'annees-80', 'braquages', 'pepites-a24'];
const SYNOPSIS =
  'Un groupe d’amis décide de passer une soirée entière à choisir le film parfait. Entre les votes, les débats et les souvenirs de séances passées, la nuit avance et chacun défend son favori avec une mauvaise foi réjouissante, jusqu’au tirage final que personne n’avait prévu.';

function showcaseItems(count, { ranked = false, offset = 0, poster = tmdbSourcedPoster } = {}) {
  return Array.from({ length: count }, (_, index) => ({
    id: 1000 + offset + index,
    mediaType: 'movie',
    title: `Film de démonstration ${offset + index + 1}`,
    year: `${2000 + ((offset + index) % 25)}`,
    posterPath: poster(`showcase-${offset + index}`),
    voteAverage: 6.5 + ((index * 7) % 30) / 10,
    runtimeMinutes: 88 + ((index * 13) % 70),
    genreIds: [GENRE_IDS[index % GENRE_IDS.length], GENRE_IDS[(index + 3) % GENRE_IDS.length]],
    rank: ranked ? index + 1 : null,
    eventCount: ranked ? 12 - (index % 10) : null,
  }));
}

const SHOWCASE_SIZES = { trending: 91, 'most-proposed': 10, 'now-playing': 40, provider: 40 };

function showcase(section) {
  return {
    section,
    theme: null,
    items: showcaseItems(SHOWCASE_SIZES[section] ?? 20, {
      ranked: section === 'most-proposed',
      offset: section === 'trending' ? 0 : 200,
      poster: section === 'most-proposed' ? relayStoredPoster : tmdbSourcedPoster,
    }),
    disclaimer: 'Données de démonstration',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  };
}

function themes() {
  return {
    items: THEMES.map((theme, index) => ({
      theme,
      posters: [0, 1, 2].map((slot) => ({
        title: `Film ${index}-${slot}`,
        posterPath: tmdbSourcedPoster(`theme-${index}-${slot}`),
      })),
    })),
  };
}

function collections() {
  return {
    items: Array.from({ length: 120 }, (_, index) => ({
      id: 500 + index,
      name: `Saga de démonstration ${index + 1}`,
      overview: SYNOPSIS.slice(0, 190),
      posterPath: tmdbSourcedPoster(`saga-${index}`),
      movieCount: 3 + (index % 6),
      previewPosterPaths: [0, 1, 2].map((slot) => tmdbSourcedPoster(`saga-${index}-${slot}`)),
      movieIds: Array.from({ length: 3 + (index % 6) }, (_, slot) => 9000 + index * 10 + slot),
    })),
    disclaimer: 'Données de démonstration',
    tmdbAttributionUrl: 'https://www.themoviedb.org/',
  };
}

function libraryItem(index, prefix) {
  return {
    tmdbId: 3000 + index,
    mediaType: 'movie',
    title: `Film vu ${index + 1}`,
    year: `${1990 + (index % 30)}`,
    posterPath: relayStoredPoster(`${prefix}-${index}`),
    voteAverage: 7.1 + (index % 20) / 10,
    runtimeMinutes: 95 + (index % 40),
    genreIds: [GENRE_IDS[index % GENRE_IDS.length]],
  };
}

function minimalProfile() {
  return {
    handle: STUB_HANDLE,
    displayName: 'Lighthouse',
    avatarId: 'alpha',
    bio: 'Profil de recette Lighthouse',
    memberSince: '2024-03-15T00:00:00Z',
    followingCount: 0,
    followersCount: 0,
    isSupporter: false,
    isFollowedByMe: null,
  };
}

function minimalStats() {
  return {
    eventsCreated: 0,
    eventsJoined: 0,
    moviesProposed: 0,
    votesCast: 0,
    winningProposals: 0,
    moviesSeen: 0,
    currentStreakWeeks: 0,
    bestStreakWeeks: 0,
    favoriteGenres: [],
    dailyActivity: [],
  };
}

function activeProfile() {
  return {
    handle: STUB_ACTIVE_HANDLE,
    displayName: 'Lighthouse',
    avatarId: 'laser',
    bio: 'Profil de recette Lighthouse, rempli comme un membre actif',
    memberSince: '2024-03-15T00:00:00Z',
    followingCount: 11,
    followersCount: 7,
    isSupporter: false,
    isFollowedByMe: null,
    isWatchlistPublic: true,
    watchlistCount: 146,
    isWatchedPublic: true,
    favorites: [0, 1].map((index) => ({
      tmdbId: 4000 + index,
      mediaType: 'movie',
      title: `Film favori ${index + 1}`,
      year: '2026',
      posterPath: relayStoredPoster(`favorite-${index}`),
    })),
    banner: {
      source: 'film',
      imageUrl: relayPoster('w1280', 'banner'),
      tmdbId: STUB_MOVIE_ID,
      title: 'Film de démonstration 1',
    },
    accentColor: 'blue',
  };
}

function stats() {
  const start = Date.UTC(2026, 5, 1);
  return {
    eventsCreated: 45,
    eventsJoined: 1,
    moviesProposed: 62,
    votesCast: 64,
    winningProposals: 8,
    proposalsAverageRating: 6.25,
    moviesSeen: 9,
    publicListCount: 3,
    currentStreakWeeks: 25,
    bestStreakWeeks: 25,
    favoriteGenres: GENRE_IDS.slice(0, 6).map((genreId, index) => ({
      genreId,
      count: 36 - index * 5,
    })),
    dailyActivity: Array.from({ length: 176 }, (_, day) => ({
      date: new Date(start + day * 86_400_000).toISOString().slice(0, 10),
      count: day % 7 === 5 ? 2 : 0,
    })),
  };
}

function watchedMovies() {
  return {
    items: Array.from({ length: 12 }, (_, index) => ({
      ...libraryItem(index, 'watched'),
      watchedAt: new Date(Date.UTC(2026, 10, 19) - index * 86_400_000 * 3).toISOString(),
      myRating: index % 3 === 0 ? 8 : null,
      source: 'night',
    })),
    total: 40,
  };
}

function watchlist(take) {
  return {
    items: Array.from({ length: Math.min(take, 24) }, (_, index) => ({
      ...libraryItem(index, 'watchlist'),
      createdAt: '2026-11-16T21:27:05Z',
      onLetterboxd: false,
    })),
    total: 146,
  };
}

function publicLists() {
  return {
    items: Array.from({ length: 3 }, (_, index) => ({
      id: `6afca0ffd36a2f3582aaae1${index}`,
      name: `Liste de démonstration ${index + 1}`,
      description: 'Une sélection pour les soirées entre amis',
      itemCount: 12 + index,
      posterPaths: [0, 1, 2, 3].map((slot) => relayStoredPoster(`list-${index}-${slot}`)),
      createdAt: '2026-11-17T18:46:23Z',
      updatedAt: '2026-11-17T18:47:20Z',
      memberCount: 2,
      watchedCount: null,
    })),
  };
}

function provider(providerId, name, type) {
  return {
    providerId,
    name,
    logoPath: relayPoster('w45', `provider-${providerId}`),
    type,
  };
}

function movieDetails(tmdbId, mediaType) {
  const isTv = mediaType === 'tv';
  return {
    tmdbId,
    mediaType,
    title: isTv ? 'Série de démonstration' : 'Film de démonstration 1',
    overview: SYNOPSIS,
    tagline: 'Une soirée, un film, aucune dispute.',
    director: 'Réalisatrice Test',
    cast: Array.from({ length: 8 }, (_, index) => `Interprète ${index + 1}`),
    runtimeMinutes: isTv ? 60 : 108,
    genres: ['Horreur', 'Thriller'],
    releaseDate: '2026-05-13',
    trailerUrl: null,
    voteAverage: 8.156,
    posterPath: tmdbSourcedPoster(`details-${tmdbId}`),
    backdropPath: relayPoster('w780', `backdrop-${tmdbId}`),
    seasonCount: isTv ? 1 : null,
    episodeCount: isTv ? 5 : null,
    watchProviders: [
      provider(8, 'Netflix', 'flatrate'),
      provider(337, 'Disney Plus', 'flatrate'),
      provider(10, 'Amazon Video', 'rent'),
      provider(2, 'Apple TV', 'rent'),
      provider(3, 'Google Play Movies', 'buy'),
    ],
    tmdbWatchPageUrl: `https://www.themoviedb.org/${mediaType}/${tmdbId}/watch?locale=FR`,
    originalTitle: isTv ? 'Demo Show' : 'Demo Movie',
    originalLanguage: 'en',
    productionCountries: ['US', 'GB'],
    budget: isTv ? null : 750_000,
    voteCount: 6722,
    certification: '16',
    collection: null,
    directorId: 2_381_985,
    castMembers: Array.from({ length: 20 }, (_, index) => ({
      name: `Interprète ${index + 1}`,
      character: `Personnage ${index + 1}`,
      profilePath: relayPoster('w185', `person-${index}`),
    })),
    crew: [
      { job: 'director', name: 'Réalisatrice Test' },
      { job: 'writer', name: 'Scénariste Test' },
      { job: 'composer', name: 'Compositeur Test' },
      { job: 'photography', name: 'Chef opérateur Test' },
    ],
    videos: [],
  };
}

function event(slug) {
  return {
    _id: 'evt-lh',
    title: 'Lighthouse',
    date: '2030-12-15',
    time: '21:00',
    slug,
    isHost: false,
    isFinished: false,
    lifecycle: 'live',
    winnerMovie: null,
    participantCount: 0,
    movieCount: 0,
    participants: [],
    config: {
      theme: null,
      maxProposalsPerParticipant: null,
      maxParticipants: null,
      wheelMode: 'strictRandom',
    },
  };
}

const MINIMAL_USER_PATH = `/api/v1/users/${STUB_HANDLE}`;
const ACTIVE_USER_PATH = `/api/v1/users/${STUB_ACTIVE_HANDLE}`;
const MOVIE_DETAILS_PATH = /^\/api\/v1\/movies\/tmdb\/(\d+)\/details$/;
const POSTER_PATH = /^\/api\/v1\/posters\/tmdb\/(w\d+)\/([\w.-]+)$/;

function jsonRoutes(url) {
  const path = url.pathname;
  const params = url.searchParams;
  const routes = {
    '/api/v1/auth/oauth/providers': () => ({ providers: [] }),
    '/api/v1/movies/showcase': () => showcase(params.get('section') ?? 'trending'),
    '/api/v1/movies/showcase/themes': themes,
    '/api/v1/movies/collections': collections,
    [MINIMAL_USER_PATH]: minimalProfile,
    [`${MINIMAL_USER_PATH}/stats`]: minimalStats,
    [`${MINIMAL_USER_PATH}/watched-movies`]: () => ({ items: [] }),
    [ACTIVE_USER_PATH]: activeProfile,
    [`${ACTIVE_USER_PATH}/stats`]: stats,
    [`${ACTIVE_USER_PATH}/watched-movies`]: watchedMovies,
    [`${ACTIVE_USER_PATH}/watchlist`]: () => watchlist(Number(params.get('take') ?? 4)),
    [`${ACTIVE_USER_PATH}/lists`]: publicLists,
  };
  if (routes[path]) return routes[path]();
  const details = MOVIE_DETAILS_PATH.exec(path);
  if (details) return movieDetails(Number(details[1]), params.get('mediaType') ?? 'movie');
  if (path.startsWith('/api/v1/events/slug/'))
    return event(path.slice('/api/v1/events/slug/'.length));
  if (/^\/api\/v1\/events\/[^/]+\/movies$/.test(path)) return [];
  return undefined;
}

let sharedImageBank;

export function startApiStub({ port, webOrigin, onUnknownRequest = () => {} }) {
  sharedImageBank ??= buildImageBank();
  const images = sharedImageBank;
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', webOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, sentry-trace, baggage');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    const url = new URL(req.url ?? '/', webOrigin);
    const poster = POSTER_PATH.exec(url.pathname);
    if (poster) {
      const image = stubImageFor(images, poster[1], poster[2]);
      if (image) {
        res
          .writeHead(200, {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
          })
          .end(image);
        return;
      }
    }
    if (/^\/api\/v1\/events\/[^/]+\/stream$/.test(url.pathname)) {
      res
        .writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
        .end('retry: 600000\n\nevent: ready\ndata: {}\n\n');
      return;
    }
    if (url.pathname === '/api/v1/usage-counts') {
      req.resume();
      res.writeHead(204).end();
      return;
    }
    if (url.pathname === '/api/1/envelope/') {
      req.resume();
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
      return;
    }
    const body = jsonRoutes(url);
    if (body !== undefined) {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
      return;
    }
    onUnknownRequest(req.method, url.pathname + url.search);
    res
      .writeHead(404, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ message: 'Not Found' }));
  });
  server.listen(port, 'localhost');
  return server;
}

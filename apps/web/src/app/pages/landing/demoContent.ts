import { SITE_URL } from '@/shared/seo/siteMeta';
import type { PosterTone } from './DemoPoster';

export const DEMO_QR_URL = SITE_URL;

export const DEMO_PARTICIPANTS = ['Léa', 'Sam', 'Nico', 'Inès'] as const;

type DemoMovie = {
  title: string;
  meta: string;
  tone: PosterTone;
  up: number;
  down: number;
};

export const DEMO_EVENT_MOVIES: readonly DemoMovie[] = [
  { title: 'Whiplash', meta: '2014 / 1h47 / 4,3', tone: 1, up: 4, down: 0 },
  { title: 'Interstellar', meta: '2014 / 2h49 / 4,1', tone: 2, up: 3, down: 1 },
  { title: 'Parasite', meta: '2019 / 2h12 / 4,4', tone: 3, up: 4, down: 0 },
];

export const DEMO_WHEEL_MOVIES = [
  'Whiplash',
  'Interstellar',
  'Parasite',
  'Blade Runner',
  'Le Grand Bain',
  'Drive My Car',
] as const;

export const DEMO_WINNER = 'Whiplash';

export const DEMO_LAST_SEEN: readonly { title: string; tone: PosterTone }[] = [
  { title: 'Whiplash', tone: 1 },
  { title: 'Drive My Car', tone: 5 },
  { title: 'Parasite', tone: 3 },
  { title: 'Blade Runner', tone: 4 },
];

export const DEMO_PROFILE_STATS = { events: 23, movies: 61, winners: 14 } as const;

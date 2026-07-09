import { createRoot } from 'react-dom/client';
import './src/index.css';
import { LocaleProvider, useTranslation } from '@/shared/i18n';
import { MovieCardList } from '@/features/movies/components/MovieCardList';
import { MovieCardGrid } from '@/features/movies/components/MovieCardGrid';
import type { MovieData, WatchProviderOffer } from '@/shared/types/movie';

const providersFull: WatchProviderOffer[] = [
  { providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' },
  { providerId: 337, name: 'Disney+', logoPath: null, type: 'flatrate' },
  { providerId: 1899, name: 'Max', logoPath: null, type: 'flatrate' },
  { providerId: 2, name: 'Apple TV', logoPath: null, type: 'rent' },
  { providerId: 3, name: 'Google Play', logoPath: null, type: 'rent' },
  { providerId: 68, name: 'Microsoft', logoPath: null, type: 'buy' },
  { providerId: 35, name: 'Rakuten', logoPath: null, type: 'buy' },
];

function makeMovie(over: Partial<MovieData>): MovieData {
  return {
    id: 'm1',
    eventId: 'e1',
    participantId: 'p1',
    tmdbId: 693134,
    title: 'Dune : Deuxième Partie',
    year: '2024',
    posterPath: null,
    proposerPseudo: 'Alice',
    score: 5,
    up: 4,
    down: 1,
    voteAverage: 8.2,
    runtimeMinutes: 166,
    watchProviders: providersFull,
    tmdbWatchPageUrl: null,
    seenCount: 1,
    seenByPseudos: ['Bob'],
    ...over,
  };
}

function Demo() {
  const { t } = useTranslation();
  const common = {
    slug: 'demo',
    participantId: 'p1',
    participantPseudo: 'Alice',
    isFinished: false,
    isHost: true,
    onVote: async () => {},
    onRemove: async () => {},
    refresh: () => {},
    onActionError: () => {},
    t,
    participantAvatars: {},
    participantAvatarsByPseudo: {},
  };
  const movieAbo = makeMovie({});
  const movieNoAbo = makeMovie({
    id: 'm2',
    title: 'Le Comte de Monte-Cristo',
    watchProviders: providersFull.filter((p) => p.type !== 'flatrate'),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 620 }}>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <MovieCardList movie={movieAbo} {...common} eager />
        <MovieCardList movie={movieNoAbo} {...common} />
      </ul>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 210px)',
          gap: 12,
        }}
      >
        <MovieCardGrid movie={movieAbo} {...common} eager />
      </ul>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <LocaleProvider>
    <Demo />
  </LocaleProvider>
);

import { describe, it, expect } from 'vitest';
import { ROUTES, movieSlug, parseMovieRef, withReturnTo } from '@/app/routes';

describe('movie page routes', () => {
  it('gives each film and show a readable address built from its title', () => {
    expect(ROUTES.moviePagePattern).toBe('/film/:movieRef');
    expect(ROUTES.showPagePattern).toBe('/serie/:movieRef');
    expect(ROUTES.moviePage({ tmdbId: 438631, mediaType: 'movie', title: 'Dune' })).toBe(
      '/film/438631-dune'
    );
    expect(ROUTES.moviePage({ tmdbId: 1399, mediaType: 'tv', title: 'Game of Thrones' })).toBe(
      '/serie/1399-game-of-thrones'
    );
  });

  it('carries the night the film was opened from', () => {
    expect(
      ROUTES.moviePage({ tmdbId: 14306, mediaType: 'movie', title: 'Marley & moi' }, 'Ab3x')
    ).toBe('/film/14306-marley-moi?soiree=Ab3x');
  });

  it('keeps the bare id when the title gives no usable slug', () => {
    expect(ROUTES.moviePage({ tmdbId: 7, mediaType: 'movie', title: '!!!' })).toBe('/film/7');
    expect(ROUTES.moviePage({ tmdbId: 7, mediaType: 'movie' })).toBe('/film/7');
  });

  it('folds accents and punctuation into a short slug', () => {
    expect(movieSlug('Le Fabuleux Destin d’Amélie Poulain')).toBe(
      'le-fabuleux-destin-d-amelie-poulain'
    );
    expect(movieSlug('Wildwood : La prophétie de la forêt')).toBe(
      'wildwood-la-prophetie-de-la-foret'
    );
    expect(movieSlug('x'.repeat(120))).toHaveLength(60);
  });

  it('reads the TMDB id back from the address', () => {
    expect(parseMovieRef('438631-dune')).toBe(438631);
    expect(parseMovieRef('438631')).toBe(438631);
    expect(parseMovieRef('dune')).toBeNull();
    expect(parseMovieRef('0-dune')).toBeNull();
    expect(parseMovieRef(undefined)).toBeNull();
  });
});

describe('withReturnTo', () => {
  it('omits the returnTo parameter when the target is the root', () => {
    expect(withReturnTo(ROUTES.login, ROUTES.home)).toBe(ROUTES.login);
  });

  it('omits the returnTo parameter when it is empty', () => {
    expect(withReturnTo(ROUTES.login, '')).toBe(ROUTES.login);
  });

  it('adds the encoded returnTo for any other page', () => {
    expect(withReturnTo(ROUTES.login, ROUTES.watchlist)).toBe(
      `${ROUTES.login}?returnTo=${encodeURIComponent(ROUTES.watchlist)}`
    );
    expect(withReturnTo(ROUTES.login, ROUTES.myEvents)).toBe(
      `${ROUTES.login}?returnTo=${encodeURIComponent(ROUTES.myEvents)}`
    );
  });
});

describe('ROUTES', () => {
  it('sert la landing sur la racine et conserve /decouvrir pour la redirection', () => {
    expect(ROUTES.home).toBe('/');
    expect(ROUTES.howItWorks).toBe('/decouvrir');
    expect(ROUTES.howItWorks).not.toBe(ROUTES.home);
  });

  it('gives a night a short recap address and a rating link that can name the movie', () => {
    expect(ROUTES.nightRecapPattern).toBe('/r/:slug');
    expect(ROUTES.nightRecap('7fKq2p')).toBe('/r/7fKq2p');
    expect(ROUTES.eventDetailRating('7fKq2p')).toBe('/e/7fKq2p?rate');
    expect(ROUTES.eventDetailRating('7fKq2p', 'abc123')).toBe('/e/7fKq2p?rate=abc123');
  });
});

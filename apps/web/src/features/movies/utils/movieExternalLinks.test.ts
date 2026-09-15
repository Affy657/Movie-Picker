import { describe, it, expect } from 'vitest';
import { allocineUrl, imdbUrl, letterboxdUrl, tmdbPageUrl } from './movieExternalLinks';

describe('movieExternalLinks', () => {
  it('letterboxdUrl pointe vers la fiche TMDB pour un film', () => {
    expect(letterboxdUrl(27205, 'movie', 'Inception')).toBe('https://letterboxd.com/tmdb/27205/');
  });

  it('letterboxdUrl switches to a title search for a TV show', () => {
    expect(letterboxdUrl(1399, 'tv', 'Game of Thrones')).toBe(
      'https://letterboxd.com/search/films/Game%20of%20Thrones/'
    );
  });

  it('imdbUrl combines the title and the year', () => {
    expect(imdbUrl('Inception', '2010')).toBe('https://www.imdb.com/find/?q=Inception%202010&s=tt');
  });

  it('imdbUrl works without a year', () => {
    expect(imdbUrl('Inception')).toBe('https://www.imdb.com/find/?q=Inception&s=tt');
  });

  it('allocineUrl encodes the searched title', () => {
    expect(allocineUrl('Amélie')).toBe('https://www.allocine.fr/recherche/?q=Am%C3%A9lie');
  });

  it('tmdbPageUrl tells movie and TV show apart', () => {
    expect(tmdbPageUrl(27205, 'movie')).toBe('https://www.themoviedb.org/movie/27205');
    expect(tmdbPageUrl(1399, 'tv')).toBe('https://www.themoviedb.org/tv/1399');
  });
});

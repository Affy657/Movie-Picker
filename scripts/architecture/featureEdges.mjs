export const FEATURE_EDGES = {
  auth: [],
  movies: ['auth'],
  events: ['movies', 'auth'],
  letterboxd: ['movies', 'auth'],
  watchlist: ['letterboxd', 'events', 'movies', 'auth'],
  profile: ['watchlist', 'events', 'movies', 'auth'],
  watched: ['profile', 'watchlist', 'movies', 'auth'],
  lists: ['watched', 'profile', 'watchlist', 'movies', 'auth'],
  notifications: ['auth'],
};

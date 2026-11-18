export const FEATURE_EDGES = {
  auth: [],
  movies: ['auth'],
  events: ['movies', 'auth'],
  letterboxd: ['movies', 'auth'],
  library: ['letterboxd', 'events', 'movies', 'auth'],
  profile: ['library', 'events', 'movies', 'auth'],
  notifications: ['auth'],
};

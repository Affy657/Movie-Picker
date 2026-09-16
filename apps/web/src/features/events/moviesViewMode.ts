export type MoviesViewMode = 'grid' | 'list';

const STORAGE_KEY = 'movies-view';

export function readMoviesViewMode(): MoviesViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

export function persistMoviesViewMode(mode: MoviesViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    return;
  }
}

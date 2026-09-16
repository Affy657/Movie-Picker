import { describe, it, expect, beforeEach } from 'vitest';
import { persistMoviesViewMode, readMoviesViewMode } from '@/features/events/moviesViewMode';

describe('moviesViewMode', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to the list', () => {
    expect(readMoviesViewMode()).toBe('list');
  });

  it('remembers the grid once chosen and ignores unknown values', () => {
    persistMoviesViewMode('grid');
    expect(readMoviesViewMode()).toBe('grid');
    localStorage.setItem('movies-view', 'mosaic');
    expect(readMoviesViewMode()).toBe('list');
  });
});

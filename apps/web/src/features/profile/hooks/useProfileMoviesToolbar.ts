import { useCallback } from 'react';
import {
  useMovieListToolbar,
  type ActiveToolbarChip,
  type MovieListSortKey,
  type SortDirection,
} from '@/features/movies/hooks/useMovieListToolbar';
import type { MovieMediaType } from '@/shared/types/movie';
import type { UserWatchedMovieItem } from '@/features/profile/api/profileApi';

export type ProfileMoviesSortKey = MovieListSortKey;
export type { SortDirection, ActiveToolbarChip };

interface UseProfileMoviesToolbarOptions {
  items: UserWatchedMovieItem[];
  tmdbLanguage: string;
  mediaTypeLabels: Record<MovieMediaType, string>;
}

export function useProfileMoviesToolbar({
  items,
  tmdbLanguage,
  mediaTypeLabels,
}: UseProfileMoviesToolbarOptions) {
  const comparePrimary = useCallback(
    (a: UserWatchedMovieItem, b: UserWatchedMovieItem) => a.watchedAt.localeCompare(b.watchedAt),
    []
  );

  return useMovieListToolbar({ items, tmdbLanguage, mediaTypeLabels, comparePrimary });
}

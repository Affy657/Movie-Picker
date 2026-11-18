import { useMemo } from 'react';
import type { RatingScale } from '@/shared/types/theme';
import type { MovieMediaType, TitleSummary, WatchProviderOffer } from '@/shared/types/movie';
import {
  LIBRARY_FILTERS,
  compareTitles,
  useCollectionToolbar,
  type SortRule,
  type ToolbarExtraFilter,
  type ToolbarSorts,
} from '@/features/movies/hooks/useCollectionToolbar';

export interface LibraryEntry extends TitleSummary {
  createdAt: string;
  watchProviders?: WatchProviderOffer[];
  tmdbWatchPageUrl?: string | null;
}

export type LibrarySortKey =
  'relevance' | 'createdAt' | 'title' | 'voteAverage' | 'duration' | 'year' | 'availability';

const LIBRARY_SORT_RULES: Readonly<Record<LibrarySortKey, SortRule<LibraryEntry>>> = {
  relevance: { compare: () => 0, direction: 'asc' },
  createdAt: { compare: (a, b) => a.createdAt.localeCompare(b.createdAt), direction: 'desc' },
  title: { compare: compareTitles, direction: 'asc' },
  voteAverage: {
    compare: (a, b) => (a.voteAverage ?? -Infinity) - (b.voteAverage ?? -Infinity),
    direction: 'desc',
  },
  duration: {
    compare: (a, b) => (a.runtimeMinutes ?? Infinity) - (b.runtimeMinutes ?? Infinity),
    direction: 'asc',
  },
  year: { compare: (a, b) => a.year.localeCompare(b.year), direction: 'desc' },
  availability: {
    compare: (a, b) => (a.watchProviders?.length ?? 0) - (b.watchProviders?.length ?? 0),
    direction: 'desc',
  },
};

export type ToolbarStorageScope = 'watchlist' | 'list' | 'watched' | 'savedList' | 'publicList';

function storageKey(scope: ToolbarStorageScope, userId: string, listId?: string): string {
  const owner = listId ? `${scope}_${listId}` : scope;
  return `moviepicker_${owner}_toolbar_${userId}`;
}

interface UseLibraryToolbarOptions<T extends LibraryEntry> {
  items: T[];
  userId: string | undefined;
  tmdbLanguage: string;
  ratingScale?: RatingScale;
  mediaTypeLabels: Record<MovieMediaType, string>;
  storageScope?: ToolbarStorageScope;
  storageListId?: string;
  extraFilter?: ToolbarExtraFilter<NoInfer<T>>;
  defaultSortBy?: LibrarySortKey;
}

export function useLibraryToolbar<T extends LibraryEntry>({
  items,
  userId,
  tmdbLanguage,
  ratingScale,
  mediaTypeLabels,
  storageScope = 'watchlist',
  storageListId,
  extraFilter,
  defaultSortBy = 'createdAt',
}: UseLibraryToolbarOptions<T>) {
  const sorts = useMemo<ToolbarSorts<LibraryEntry, LibrarySortKey>>(
    () => ({ rules: LIBRARY_SORT_RULES, defaultKey: defaultSortBy }),
    [defaultSortBy]
  );
  const key = userId ? storageKey(storageScope, userId, storageListId) : null;
  return useCollectionToolbar({
    items,
    sorts,
    filters: LIBRARY_FILTERS,
    persistence: { kind: 'localStorage', name: 'watchlistToolbar', key },
    tmdbLanguage,
    ratingScale,
    mediaTypeLabels,
    extraFilter,
  });
}

import { useMemo } from 'react';
import type { MovieMediaType } from '@/shared/types/movie';
import {
  CATALOG_FILTERS,
  compareTitles,
  useCollectionToolbar,
  useProgressiveReveal,
  type ToolbarItem,
  type ToolbarPersistence,
  type ToolbarSorts,
} from '@/features/movies/hooks/useCollectionToolbar';

export type CatalogSortKey = 'primary' | 'title' | 'year';

const CATALOG_PERSISTENCE: ToolbarPersistence = { kind: 'historyEntry', name: 'movieList' };

function compareYears(a: ToolbarItem, b: ToolbarItem): number {
  return (Number.parseInt(a.year, 10) || 0) - (Number.parseInt(b.year, 10) || 0);
}

function catalogSorts<T extends ToolbarItem>(
  comparePrimary: (a: T, b: T) => number
): ToolbarSorts<T, CatalogSortKey> {
  return {
    rules: {
      primary: { compare: comparePrimary, direction: 'desc' },
      title: { compare: compareTitles, direction: 'asc' },
      year: { compare: compareYears, direction: 'desc' },
    },
    defaultKey: 'primary',
  };
}

interface UseCatalogToolbarOptions<T extends ToolbarItem> {
  items: T[];
  tmdbLanguage: string;
  mediaTypeLabels: Record<MovieMediaType, string>;
  comparePrimary: (a: T, b: T) => number;
}

export function useCatalogToolbar<T extends ToolbarItem>({
  items,
  tmdbLanguage,
  mediaTypeLabels,
  comparePrimary,
}: UseCatalogToolbarOptions<T>) {
  const sorts = useMemo(() => catalogSorts(comparePrimary), [comparePrimary]);
  const toolbar = useCollectionToolbar({
    items,
    sorts,
    filters: CATALOG_FILTERS,
    persistence: CATALOG_PERSISTENCE,
    tmdbLanguage,
    mediaTypeLabels,
  });
  const reveal = useProgressiveReveal(
    toolbar.visibleItems,
    [
      toolbar.search,
      toolbar.selectedGenres,
      toolbar.selectedMediaTypes,
      toolbar.selectedDecade,
      toolbar.sortBy,
      toolbar.sortDir,
    ],
    CATALOG_PERSISTENCE.name
  );
  return { ...toolbar, ...reveal };
}

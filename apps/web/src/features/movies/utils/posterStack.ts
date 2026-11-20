import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';

const POSTER_STACK_SIZE = 3;

export function posterStackSources(paths: readonly (string | null | undefined)[]): string[] {
  const sources: string[] = [];
  for (const path of paths) {
    if (sources.length === POSTER_STACK_SIZE) break;
    const src = tmdbPosterSrcForListDisplay(posterImageSrc(path));
    if (src != null) sources.push(src);
  }
  return sources;
}

export function collectionPosterSources(collection: {
  previewPosterPaths?: readonly string[];
  posterPath?: string | null;
}): string[] {
  const previews = collection.previewPosterPaths ?? [];
  return posterStackSources(previews.length > 0 ? previews : [collection.posterPath]);
}

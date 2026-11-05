export function watchlistItemKey(tmdbId: number, mediaType: string | undefined): string {
  return `${tmdbId}|${mediaType ?? 'movie'}`;
}

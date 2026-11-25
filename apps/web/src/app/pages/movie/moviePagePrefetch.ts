import { useEffect } from 'react';
import { preload } from 'react-dom';
import { matchPath, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ROUTES, parseMovieRef } from '@/app/routes';
import { prefetchMovieDetails } from '@/features/movies/hooks/useMovieDetails';
import type { MovieMediaType } from '@/shared/types/movie';
import { HERO_POSTER_SIZES, heroPosterSources } from '@/app/pages/movie/heroPoster';

function moviePageOf(pathname: string): { tmdbId: number; mediaType: MovieMediaType } | null {
  const movie = matchPath(ROUTES.moviePagePattern, pathname);
  const show = movie ? null : matchPath(ROUTES.showPagePattern, pathname);
  const tmdbId = parseMovieRef((movie ?? show)?.params.movieRef);
  if (tmdbId === null) return null;
  return { tmdbId, mediaType: movie ? 'movie' : 'tv' };
}

export function useMoviePagePrefetch(): void {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  useEffect(() => {
    const page = moviePageOf(pathname);
    if (!page) return;
    void prefetchMovieDetails(queryClient, page.tmdbId, page.mediaType).then((details) => {
      const { src, srcSet } = heroPosterSources(details?.posterPath);
      if (!src) return;
      preload(src, {
        as: 'image',
        imageSrcSet: srcSet,
        imageSizes: HERO_POSTER_SIZES,
        fetchPriority: 'high',
      });
    });
  }, [pathname, queryClient]);
}

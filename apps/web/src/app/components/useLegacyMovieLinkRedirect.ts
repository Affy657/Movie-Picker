import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import type { MovieMediaType } from '@/shared/types/movie';

const LEGACY_PARAM: Record<MovieMediaType, string> = { movie: 'film', tv: 'serie' };

const NIGHT_PATH = /^\/e\/([^/]+)\/?$/;

export interface LegacyMovieTarget {
  tmdbId: number;
  mediaType: MovieMediaType;
}

export function readLegacyMovieTarget(params: URLSearchParams): LegacyMovieTarget | null {
  for (const mediaType of ['movie', 'tv'] as const) {
    const raw = params.get(LEGACY_PARAM[mediaType]);
    if (raw === null) continue;
    const tmdbId = Number(raw);
    return Number.isInteger(tmdbId) && tmdbId > 0 ? { tmdbId, mediaType } : null;
  }
  return null;
}

export function useLegacyMovieLinkRedirect(): void {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const target = readLegacyMovieTarget(new URLSearchParams(search));
    if (!target) return;
    const night = NIGHT_PATH.exec(pathname)?.[1];
    navigate(ROUTES.moviePage(target, night ? decodeURIComponent(night) : undefined), {
      replace: true,
    });
  }, [pathname, search, navigate]);
}

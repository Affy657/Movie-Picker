import { useEffect } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import type { MoviePageLocationState } from '@/features/movies/hooks/useOpenMoviePage';
import type { MovieMediaType } from '@/shared/types/movie';

const LEGACY_PARAM: Record<MovieMediaType, string> = { movie: 'film', tv: 'serie' };

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

function nightSlugOf(pathname: string): string | undefined {
  const raw = matchPath(ROUTES.eventDetailPattern, pathname)?.params.slug;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return undefined;
  }
}

function searchWithoutLegacyParams(params: URLSearchParams): string {
  const rest = new URLSearchParams(params);
  for (const name of Object.values(LEGACY_PARAM)) rest.delete(name);
  const query = rest.toString();
  return query ? `?${query}` : '';
}

export function useLegacyMovieLinkRedirect(): void {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const target = readLegacyMovieTarget(params);
    if (!target) return;
    navigate({ pathname, search: searchWithoutLegacyParams(params), hash }, { replace: true });
    const state: MoviePageLocationState = { fromApp: true };
    navigate(ROUTES.moviePage(target, nightSlugOf(pathname)), { state });
  }, [pathname, search, hash, navigate]);
}

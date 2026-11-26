import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';

export const HERO_POSTER_SIZES = '(max-width: 47.9375rem) 120px, 264px';

export function heroPosterSources(posterPath: string | null | undefined): {
  src: string | undefined;
  srcSet: string | undefined;
} {
  const src = posterImageSrc(posterPath);
  return { src, srcSet: tmdbPosterSrcSetForList(src) };
}

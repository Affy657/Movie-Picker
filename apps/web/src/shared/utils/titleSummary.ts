import type { AddTitleBody, CatalogTitle, TitleSummary } from '@/shared/types/movie';

type TitleSource = AddTitleBody | CatalogTitle;

export function toAddTitleBody(source: TitleSource): AddTitleBody {
  return {
    tmdbId: 'tmdbId' in source ? source.tmdbId : source.id,
    mediaType: source.mediaType,
    title: source.title,
    year: source.year,
    posterPath: source.posterPath,
    genreIds: source.genreIds,
    voteAverage: source.voteAverage,
    runtimeMinutes: source.runtimeMinutes,
  };
}

export function toTitleSummary(source: TitleSource): TitleSummary {
  return { ...toAddTitleBody(source), mediaType: source.mediaType ?? 'movie' };
}

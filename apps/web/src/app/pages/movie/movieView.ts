import type {
  MovieCastMember,
  MovieCrewMember,
  MovieDetails,
  MovieVideo,
} from '@/features/movies/api/moviesApi';
import type { MoviePageSeed } from '@/features/movies/hooks/useOpenMoviePage';
import type { Translate } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { MovieMediaType } from '@/shared/types/movie';
import { formatReleaseDate, yearFromDate } from '@/shared/utils/formatReleaseDate';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { extractYouTubeId } from '@/shared/utils/youtube';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import type { MovieHeroView } from '@/app/pages/movie/MovieHero';
import type { MovieInfoRow } from '@/app/pages/movie/MovieAside';
import {
  audienceOf,
  budgetLabel,
  countryNames,
  languageName,
} from '@/app/pages/movie/moviePageFacts';

interface ViewInput {
  mediaType: MovieMediaType;
  details: MovieDetails | undefined;
  seed: MoviePageSeed | undefined;
  t: Translate;
  locale: LocaleCode;
  tmdbLanguage: string;
}

function lengthLabel({ mediaType, details, seed, t }: ViewInput): string | null {
  if (mediaType === 'tv' && details?.seasonCount) {
    return pluralizeCount(
      details.seasonCount,
      'movies.details.seasonsOne',
      'movies.details.seasonsMany',
      t
    );
  }
  return formatRuntimeMinutes(details?.runtimeMinutes ?? seed?.runtimeMinutes);
}

function genresOf({ details, seed, tmdbLanguage }: ViewInput): string[] {
  if (details?.genres.length) return details.genres;
  return [...new Set((seed?.genreIds ?? []).map((id) => genreLabel(id, tmdbLanguage)))];
}

export function titleOf(details: MovieDetails | undefined, seed: MoviePageSeed | undefined) {
  return details?.title || seed?.title || '';
}

export function yearOf(details: MovieDetails | undefined, seed: MoviePageSeed | undefined) {
  return yearFromDate(details?.releaseDate) ?? (seed?.year || undefined);
}

export function buildHeroView(input: ViewInput): MovieHeroView {
  const { details, seed, mediaType } = input;
  const title = titleOf(details, seed);
  const posterSrc = posterImageSrc(details?.posterPath ?? seed?.posterPath);
  const originalTitle = details?.originalTitle;
  return {
    title,
    originalTitle: originalTitle && originalTitle !== title ? originalTitle : null,
    facts: [yearOf(details, seed), lengthLabel(input)].filter((fact): fact is string => !!fact),
    genres: genresOf(input),
    audience: audienceOf(details?.certification ?? null),
    posterSrc,
    posterSrcSet: tmdbPosterSrcSetForList(posterSrc),
    backdropSrc: details?.backdropPath ?? null,
    voteAverage: details?.voteAverage ?? seed?.voteAverage ?? null,
    voteCount: details?.voteCount ?? null,
    providers: details?.watchProviders ?? [],
    watchPageUrl: details?.tmdbWatchPageUrl ?? null,
    isTv: mediaType === 'tv',
    detailsLoaded: !!details,
  };
}

function audienceText(input: ViewInput, details: MovieDetails): string | null {
  const audience = audienceOf(details.certification);
  if (!audience) return null;
  if (audience.kind === 'all') return input.t('moviePage.audienceAll');
  return input.t(input.mediaType === 'tv' ? 'moviePage.audienceShow' : 'moviePage.audienceMovie', {
    age: audience.age,
  });
}

export function buildInfoRows(input: ViewInput, view: MovieHeroView): MovieInfoRow[] {
  const { details, t, locale, mediaType } = input;
  if (!details) return [];
  const isTv = mediaType === 'tv';
  const rows: Array<[string, string | null]> = [
    [t('moviePage.infoOriginalTitle'), view.originalTitle],
    [t('moviePage.infoLanguage'), languageName(details.originalLanguage, locale)],
    [
      t(isTv ? 'moviePage.infoFirstAired' : 'moviePage.infoReleased'),
      details.releaseDate ? formatReleaseDate(details.releaseDate, locale) : null,
    ],
    [t(isTv ? 'moviePage.infoSeasons' : 'moviePage.infoRuntime'), lengthLabel(input)],
    [t('moviePage.infoAudience'), audienceText(input, details)],
    [t('moviePage.infoCountries'), countryNames(details.productionCountries, locale)],
    [t('moviePage.infoBudget'), budgetLabel(details.budget, locale)],
  ];
  return rows
    .filter((row): row is [string, string] => !!row[1])
    .map(([label, value]) => ({ label, value }));
}

export function castOf(details: MovieDetails | undefined): MovieCastMember[] {
  if (!details) return [];
  if (details.castMembers.length > 0) return details.castMembers;
  return details.cast.map((name) => ({ name, character: null, profilePath: null }));
}

export function crewOf(
  details: MovieDetails | undefined,
  mediaType: MovieMediaType
): MovieCrewMember[] {
  if (!details) return [];
  if (details.crew.length > 0) return details.crew;
  if (!details.director) return [];
  return [{ job: mediaType === 'tv' ? 'creator' : 'director', name: details.director }];
}

export function videosOf(details: MovieDetails | undefined): MovieVideo[] {
  if (!details) return [];
  if (details.videos.length > 0) return details.videos;
  const key = extractYouTubeId(details.trailerUrl);
  return key ? [{ key, name: details.title, type: 'Trailer', language: null }] : [];
}

export function directorOf(details: MovieDetails | undefined): { id: number; name: string } | null {
  if (!details?.directorId) return null;
  const name =
    details.crew.find((member) => member.job === 'director')?.name ?? details.director ?? null;
  return name ? { id: details.directorId, name } : null;
}

export function youtubeWatchUrl(video: MovieVideo): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`;
}

export function documentTitleOf(title: string, year: string | undefined): string {
  return year && title ? `${title} (${year})` : title;
}

export function libraryItemOf({
  tmdbId,
  mediaType,
  details,
  seed,
  view,
}: {
  tmdbId: number;
  mediaType: MovieMediaType;
  details: MovieDetails | undefined;
  seed: MoviePageSeed | undefined;
  view: MovieHeroView;
}) {
  return {
    tmdbId,
    mediaType,
    title: titleOf(details, seed),
    year: yearOf(details, seed) ?? '',
    posterPath: details?.posterPath ?? seed?.posterPath ?? null,
    voteAverage: view.voteAverage,
    runtimeMinutes: details?.runtimeMinutes ?? seed?.runtimeMinutes ?? null,
    genreIds: seed?.genreIds,
  };
}

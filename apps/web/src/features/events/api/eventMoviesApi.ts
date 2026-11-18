import { fetchApi, apiPath, withHostToken } from '@/shared/api/client';
import { mapMovieData, type RawMovieData } from '@/shared/api/apiMapping';
import type { MovieData, MovieMediaType, MovieRating } from '@/shared/types/movie';

type QueryString = '' | `?${string}`;

export async function fetchEventMovies(
  slug: string,
  participantId?: string | null
): Promise<MovieData[]> {
  const suffix: QueryString = participantId
    ? `?participantId=${encodeURIComponent(participantId)}`
    : '';
  const list = await fetchApi<RawMovieData[]>(`${apiPath('events', slug, 'movies')}${suffix}`);
  return Array.isArray(list) ? list.map(mapMovieData) : [];
}

export async function addMovieToEvent(
  slug: string,
  body: {
    tmdbId: number;
    mediaType?: MovieMediaType;
    title: string;
    year: string;
    posterPath: string | null;
    participantId: string;
    genreIds?: number[];
    pitchNote?: string;
  }
): Promise<MovieData> {
  const raw = await fetchApi<RawMovieData>(apiPath('events', slug, 'movies'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapMovieData(raw);
}

export async function voteMovie(
  slug: string,
  movieId: string,
  participantId: string,
  value: number
): Promise<void> {
  await fetchApi(apiPath('events', slug, 'movies', movieId, 'vote'), {
    method: 'POST',
    body: JSON.stringify({ participantId, value }),
  });
}

export async function clearMovieVote(
  slug: string,
  movieId: string,
  participantId: string
): Promise<void> {
  const search = new URLSearchParams({ participantId });
  await fetchApi(`${apiPath('events', slug, 'movies', movieId, 'vote')}?${search.toString()}`, {
    method: 'DELETE',
  });
}

export async function removeMovieFromEvent(
  slug: string,
  movieId: string,
  participantId: string,
  hostToken?: string | null
): Promise<void> {
  await fetchApi(
    apiPath('events', slug, 'movies', movieId),
    withHostToken(hostToken, { method: 'DELETE', body: JSON.stringify({ participantId }) })
  );
}

export async function setMovieWheelExclusion(
  slug: string,
  movieId: string,
  excluded: boolean,
  hostToken?: string | null
): Promise<void> {
  await fetchApi(
    apiPath('events', slug, 'movies', movieId, 'wheel-exclusion'),
    withHostToken(hostToken, { method: 'PUT', body: JSON.stringify({ excluded }) })
  );
}

export async function setMoviePitchNote(
  slug: string,
  movieId: string,
  participantId: string,
  pitchNote: string
): Promise<void> {
  await fetchApi(apiPath('events', slug, 'movies', movieId, 'note'), {
    method: 'PUT',
    body: JSON.stringify({ participantId, pitchNote }),
  });
}

export async function deleteMoviePitchNote(
  slug: string,
  movieId: string,
  participantId: string | null,
  hostToken?: string | null
): Promise<void> {
  await fetchApi(
    apiPath('events', slug, 'movies', movieId, 'note'),
    withHostToken(hostToken, { method: 'DELETE', body: JSON.stringify({ participantId }) })
  );
}

export async function markMovieAsSeen(
  slug: string,
  movieId: string,
  participantId: string
): Promise<void> {
  await fetchApi(apiPath('events', slug, 'movies', movieId, 'seen'), {
    method: 'POST',
    body: JSON.stringify({ participantId }),
  });
}

export async function unmarkMovieAsSeen(
  slug: string,
  movieId: string,
  participantId: string
): Promise<void> {
  await fetchApi(apiPath('events', slug, 'movies', movieId, 'seen'), {
    method: 'DELETE',
    body: JSON.stringify({ participantId }),
  });
}

export async function setMovieRating(
  slug: string,
  movieId: string,
  participantId: string,
  value: number
): Promise<MovieRating> {
  return fetchApi<MovieRating>(apiPath('events', slug, 'movies', movieId, 'rating'), {
    method: 'PUT',
    body: JSON.stringify({ participantId, value }),
  });
}

export async function deleteMovieRating(
  slug: string,
  movieId: string,
  participantId: string
): Promise<void> {
  await fetchApi(apiPath('events', slug, 'movies', movieId, 'rating'), {
    method: 'DELETE',
    body: JSON.stringify({ participantId }),
  });
}

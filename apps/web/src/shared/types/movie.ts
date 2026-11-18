import type { ApiSchemas } from '@/shared/api/contract';

export type WatchProviderOffer = ApiSchemas['WatchProviderOfferResponse'];

export type MovieMediaType = ApiSchemas['MovieMediaType'];

type ServedTitle = ApiSchemas['WatchlistItemResponse'];

export type TitleSummary = Pick<
  ServedTitle,
  'tmdbId' | 'mediaType' | 'title' | 'year' | 'posterPath'
> &
  Partial<Pick<ServedTitle, 'genreIds' | 'voteAverage' | 'runtimeMinutes'>>;

export type AddTitleBody = Omit<TitleSummary, 'mediaType'> & {
  mediaType?: MovieMediaType;
};

export type CatalogTitle = Omit<AddTitleBody, 'tmdbId'> & {
  id: number;
};

export type FavoriteTitle = ApiSchemas['FavoriteTitleResponse'];

export type MovieRating = ApiSchemas['MovieRatingResponse'];

type ServedMovie = ApiSchemas['MovieWithScoreResponse'];

export type MovieData = Pick<
  ServedMovie,
  | 'eventId'
  | 'participantId'
  | 'tmdbId'
  | 'title'
  | 'year'
  | 'posterPath'
  | 'proposerPseudo'
  | 'score'
  | 'up'
  | 'down'
> &
  Partial<
    Pick<
      ServedMovie,
      | 'mediaType'
      | 'pitchNote'
      | 'excludedFromWheel'
      | 'genreIds'
      | 'proposerHandle'
      | 'voteAverage'
      | 'watchProviders'
      | 'tmdbWatchPageUrl'
      | 'runtimeMinutes'
      | 'releaseDate'
      | 'createdAt'
      | 'seenCount'
      | 'seenByPseudos'
      | 'votersUpPseudos'
      | 'ratings'
      | 'myVote'
    >
  > & {
    id: string;
    pendingVote?: boolean;
  };

export type ParticipantData = Pick<ApiSchemas['ParticipantResponse'], 'eventId' | 'pseudo'> & {
  id: string;
};

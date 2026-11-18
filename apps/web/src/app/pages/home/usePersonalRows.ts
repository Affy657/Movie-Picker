import { useQuery } from '@tanstack/react-query';
import { fetchFollowingWatchedMovies } from '@/features/profile/api/profileApi';
import { fetchMyWatchedMovies } from '@/features/library/api/watchedApi';
import { useWatchlist } from '@/features/movies/hooks/useWatchlist';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { toTitleSummary } from '@/shared/utils/titleSummary';
import type { WatchlistItem } from '@/features/movies/api/watchlistApi';
import type { PersonalRowItem } from './HomeForYou';

const FRIENDS_TAKE = 20;
const WATCHLIST_TAKE = 20;
const RECOMMENDATION_SEED_TAKE = 1;

function bestRatedFirst(a: WatchlistItem, b: WatchlistItem): number {
  const ratingGap = (b.voteAverage ?? 0) - (a.voteAverage ?? 0);
  if (ratingGap !== 0) return ratingGap;
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

export function useWatchlistRow(enabled: boolean) {
  const watchlist = useWatchlist({ enabled });
  const movies = enabled ? (watchlist.data ?? []) : [];
  const items: PersonalRowItem[] = [...movies]
    .sort(bestRatedFirst)
    .slice(0, WATCHLIST_TAKE)
    .map((movie) => toTitleSummary(movie));
  return { items, isPending: enabled && watchlist.isPending };
}

export function useFriendsWatchedRow(enabled: boolean) {
  const query = useQuery({
    queryKey: queryKeys.me.followingWatchedMovies(FRIENDS_TAKE),
    queryFn: ({ signal }) => fetchFollowingWatchedMovies(FRIENDS_TAKE, signal),
    enabled,
  });
  const movies = enabled ? (query.data?.items ?? []) : [];
  const items: PersonalRowItem[] = movies.map((movie) => toTitleSummary(movie));
  return { items, isPending: enabled && query.isPending };
}

export function useRecommendationSeed(enabled: boolean) {
  const query = useQuery({
    queryKey: queryKeys.watched.latest(RECOMMENDATION_SEED_TAKE),
    queryFn: ({ signal }) => fetchMyWatchedMovies(RECOMMENDATION_SEED_TAKE, signal),
    enabled,
  });
  const seed = enabled ? query.data?.items[0] : undefined;
  return {
    seedTmdbId: seed?.tmdbId,
    seedMediaType: seed?.mediaType,
    seedTitle: seed?.title,
    isPending: enabled && query.isPending,
  };
}

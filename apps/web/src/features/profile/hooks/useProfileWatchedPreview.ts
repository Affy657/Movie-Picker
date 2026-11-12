import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/queryKeys';
import {
  PROFILE_WATCHED_PREVIEW_TAKE,
  fetchUserWatchedMoviesPreview,
} from '@/features/profile/api/profileApi';

export function useProfileWatchedPreview(handle: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile.watchedMovies(handle, PROFILE_WATCHED_PREVIEW_TAKE),
    queryFn: ({ signal }) => fetchUserWatchedMoviesPreview(handle ?? '', signal),
    enabled: !!handle,
  });
}

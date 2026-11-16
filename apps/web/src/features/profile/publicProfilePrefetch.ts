import { useEffect } from 'react';
import { preconnect } from 'react-dom';
import { matchPath, useLocation } from 'react-router';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/routes';
import { fetchPublicProfile } from '@/features/profile/api/profileApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { DICEBEAR_ORIGIN } from '@/shared/utils/avatar';

export function prefetchPublicProfile(queryClient: QueryClient, handle: string): void {
  preconnect(DICEBEAR_ORIGIN);
  void queryClient.prefetchQuery({
    queryKey: queryKeys.profile.public(handle),
    queryFn: () => fetchPublicProfile(handle),
    retry: false,
  });
}

export function usePublicProfilePrefetch(): void {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  useEffect(() => {
    const handle = matchPath(ROUTES.profilePattern, pathname)?.params.handle;
    if (handle) prefetchPublicProfile(queryClient, handle);
  }, [pathname, queryClient]);
}

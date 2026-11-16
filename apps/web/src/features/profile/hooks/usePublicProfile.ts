import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { fetchPublicProfile } from '@/features/profile/api/profileApi';

export function usePublicProfile(handle: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile.public(handle),
    queryFn: () => fetchPublicProfile(handle ?? ''),
    enabled: !!handle,
    retry: false,
  });
}

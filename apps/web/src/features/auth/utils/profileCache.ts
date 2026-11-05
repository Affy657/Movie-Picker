import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { UserProfile } from '@/features/auth/types';

export function applyUpdatedProfile(queryClient: QueryClient, profile: UserProfile) {
  queryClient.setQueryData(queryKeys.auth.me, profile);
  void queryClient.invalidateQueries({ queryKey: queryKeys.profile.publicAll });
}

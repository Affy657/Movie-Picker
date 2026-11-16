import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useOptimisticProfilePatch } from '@/features/auth/hooks/useOptimisticProfilePatch';

export function useDimWatched() {
  const { user } = useAuth();
  const { error, apply } = useOptimisticProfilePatch('watched.dim.error');

  const change = (dimWatched: boolean) => {
    if (!user) return;
    apply({ dimWatched });
  };

  return { enabled: user?.dimWatched ?? false, error, change };
}

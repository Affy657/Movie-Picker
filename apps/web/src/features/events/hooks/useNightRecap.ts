import { useQuery } from '@tanstack/react-query';
import { fetchNightRecap } from '@/features/events/api/eventsApi';
import { queryKeys } from '@/shared/hooks/queryKeys';

export function useNightRecap(recapSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.event.recap(recapSlug),
    queryFn: () => fetchNightRecap(recapSlug!),
    enabled: !!recapSlug,
  });
}

import { useQuery } from '@tanstack/react-query';
import { fetchEventBySlug } from '@/features/events/api/eventsApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { getLivePollingRefetchIntervalForEventQuery } from '@/features/events/hooks/useEventLive';

/**
 * Détail soirée (slug + token hôte optionnel). Polling « live » tant que la soirée n’est pas terminée
 * (rythme phase à venir / en cours selon `date`+`time` UTC — voir `useEventLive`).
 * Pour un passage pile à l’heure affichée sans attendre le prochain tick Query, l’écran doit aussi
 * appeler `useEventLive` (ex. `EventDetail`) : cet intervalle seul ne force pas de re-render au créneau.
 */
export function useEvent(slug: string | undefined, hostToken: string | null) {
  return useQuery({
    queryKey: queryKeys.event.detail(slug, hostToken),
    queryFn: () => fetchEventBySlug(slug!, hostToken),
    enabled: !!slug,
    refetchInterval: (query) => getLivePollingRefetchIntervalForEventQuery(query.state.data),
  });
}

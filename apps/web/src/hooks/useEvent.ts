import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../api/client';
import type { EventData } from '../types/event';
import { queryKeys } from './queryKeys';
import { getLivePollingRefetchIntervalForEventQuery } from './useEventLive';

/**
 * Détail soirée (slug + token hôte optionnel). Polling « live » tant que la soirée n’est pas terminée
 * (rythme phase à venir / en cours selon `date`+`time` UTC — voir `useEventLive`).
 * Pour un passage pile à l’heure affichée sans attendre le prochain tick Query, l’écran doit aussi
 * appeler `useEventLive` (ex. `EventDetail`) : cet intervalle seul ne force pas de re-render au créneau.
 */
export function useEvent(slug: string | undefined, hostToken: string | null) {
  const eventUrl =
    slug && slug.length > 0
      ? `/events/slug/${slug}${hostToken ? `?host=${encodeURIComponent(hostToken)}` : ''}`
      : '';

  return useQuery({
    queryKey: queryKeys.event.detail(slug ?? '', hostToken),
    queryFn: () => fetchApi<EventData>(eventUrl),
    enabled: !!slug,
    refetchInterval: (query) => getLivePollingRefetchIntervalForEventQuery(query.state.data),
  });
}

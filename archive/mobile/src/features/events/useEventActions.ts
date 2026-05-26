import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import { removeParticipant } from '@/api/events';

export function useEventActions(idOrSlug: string) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const kick = useMutation({
    mutationFn: (participantId: string) => removeParticipant(idOrSlug, participantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', idOrSlug] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Retrait impossible.'),
  });

  return {
    kickParticipant: (participantId: string) => kick.mutate(participantId),
    isKicking: kick.isPending,
    error,
    clearError: () => setError(null),
  };
}

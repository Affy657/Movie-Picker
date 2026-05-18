import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { cancelVote, markSeen, removeMovie, unmarkSeen, vote as apiVote } from '@/api/movies';
import { toastSuccess } from '@/lib/toast';

export function useMovieActions(slug: string, participantId: string | null) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['movies', slug] });
    queryClient.invalidateQueries({ queryKey: ['event', slug] });
  };

  const voteMutation = useMutation({
    mutationFn: async ({ movieId, value }: { movieId: string; value: 1 | -1 | null }) => {
      if (!participantId) throw new Error('participantId requis');
      if (value === null) {
        await cancelVote(slug, movieId, participantId);
      } else {
        await apiVote(slug, movieId, { participantId, value });
      }
    },
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof Error ? err.message : 'Vote impossible.'),
  });

  const seenMutation = useMutation({
    mutationFn: async ({ movieId, currentlySeen }: { movieId: string; currentlySeen: boolean }) => {
      if (!participantId) throw new Error('participantId requis');
      if (currentlySeen) {
        await unmarkSeen(slug, movieId, participantId);
      } else {
        await markSeen(slug, movieId, { participantId });
      }
    },
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof Error ? err.message : 'Action impossible.'),
  });

  const removeMutation = useMutation({
    mutationFn: async (movieId: string) => {
      await removeMovie(slug, movieId);
    },
    onSuccess: () => {
      invalidate();
      toastSuccess('Film retiré.');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Retrait impossible.'),
  });

  return {
    vote: (movieId: string, value: 1 | -1 | null) => voteMutation.mutate({ movieId, value }),
    toggleSeen: (movieId: string, currentlySeen: boolean) =>
      seenMutation.mutate({ movieId, currentlySeen }),
    remove: (movieId: string) => removeMutation.mutate(movieId),
    isPending: voteMutation.isPending || seenMutation.isPending || removeMutation.isPending,
    error,
    clearError: () => setError(null),
  };
}

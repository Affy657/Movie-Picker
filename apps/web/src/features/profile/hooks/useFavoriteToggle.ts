import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { UserProfile } from '@/features/auth/types';
import { addFavorite, FAVORITES_MAX, removeFavorite } from '@/features/profile/api/profileApi';
import { favoriteOf, isSameFavorite } from '@/features/profile/utils/favorites';
import { API_ERROR_REASONS, ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import type { FavoriteTitle, TitleSummary } from '@/shared/types/movie';

type FavoriteChange =
  { kind: 'add' } | { kind: 'remove' } | { kind: 'replace'; out: FavoriteTitle };

const NO_FAVORITES: readonly FavoriteTitle[] = [];

async function replaceFavorite(out: FavoriteTitle, incoming: FavoriteTitle) {
  await removeFavorite(out.tmdbId, out.mediaType);
  try {
    return await addFavorite(incoming);
  } catch (error) {
    await addFavorite(out).catch(() => undefined);
    throw error;
  }
}

export function useFavoriteToggle(title: TitleSummary) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const favorites = user?.favorites ?? NO_FAVORITES;
  const isFavorite = favorites.some((favorite) => isSameFavorite(favorite, title));

  const change = useMutation({
    mutationFn: (request: FavoriteChange) => {
      if (request.kind === 'remove') return removeFavorite(title.tmdbId, title.mediaType);
      if (request.kind === 'add') return addFavorite(favoriteOf(title));
      return replaceFavorite(request.out, favoriteOf(title));
    },
    onMutate: () => setError(null),
    onSuccess: ({ items }) => {
      queryClient.setQueryData<UserProfile | null>(queryKeys.auth.me, (current) =>
        current ? { ...current, favorites: items } : current
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.publicAll });
      setChoosing(false);
    },
    onError: (failure) => {
      if (ApiError.is(failure) && failure.reason === API_ERROR_REASONS.favoritesLimitReached) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
        setChoosing(true);
        return;
      }
      setError(t('moviePage.favorite.error'));
    },
  });

  const toggle = () => {
    if (isFavorite) change.mutate({ kind: 'remove' });
    else if (favorites.length >= FAVORITES_MAX) setChoosing(true);
    else change.mutate({ kind: 'add' });
  };

  return {
    isFavorite,
    favorites,
    choosing,
    pending: change.isPending,
    error,
    toggle,
    replace: (out: FavoriteTitle) => change.mutate({ kind: 'replace', out }),
    stopChoosing: () => setChoosing(false),
  };
}

export type FavoriteToggleState = ReturnType<typeof useFavoriteToggle>;

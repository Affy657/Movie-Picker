import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Film, Plus, X } from 'lucide-react';
import { FAVORITES_ANCHOR } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { API_ERROR_REASONS, ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import Chip from '@/shared/components/Chip';
import IconButton from '@/shared/components/IconButton';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import type { MovieSearchItem } from '@/features/movies/api/moviesApi';
import { useWatchlist } from '@/features/movies/hooks/useWatchlist';
import { useWatchedMovies } from '@/features/library/hooks/useWatched';
import { addFavorite, FAVORITES_MAX, removeFavorite } from '@/features/profile/api/profileApi';
import { favoriteOf, isSameFavorite } from '@/features/profile/utils/favorites';
import type { UserProfile } from '@/features/auth/types';
import type { FavoriteTitle } from '@/shared/types/movie';
import { toTitleSummary } from '@/shared/utils/titleSummary';
import ProfileEditSection from './ProfileEditSection';
import styles from './ProfileEditFavorites.module.css';

const loadAddMovieForm = () => import('@/features/movies/components/AddMovieForm');
const AddMovieForm = lazy(loadAddMovieForm);
const SEARCH_CHUNKS = [loadAddMovieForm];
const SUGGESTIONS_PER_GROUP = 20;

interface Props {
  user: UserProfile;
  onSaved: () => void;
}

function toFavorite(item: MovieSearchItem): FavoriteTitle {
  return favoriteOf(toTitleSummary(item));
}

function FavoritePoster({ posterPath }: Readonly<{ posterPath: string | null }>) {
  const raw = posterImageSrc(posterPath);
  const src = raw ? tmdbPosterSrcForListDisplay(raw) : undefined;
  if (src) return <img src={src} alt="" className={styles.poster} loading="lazy" />;
  return (
    <span className={clsx(styles.poster, styles.posterEmpty)} aria-hidden>
      <Film size={ICON_SIZE.xl} />
    </span>
  );
}

function usePickerSuggestions(enabled: boolean) {
  const { t } = useTranslation();
  const watched = useWatchedMovies({ enabled });
  const watchlist = useWatchlist({ enabled });

  return useMemo(() => {
    const seen: MovieSearchItem[] = (watched.data?.items ?? [])
      .slice(0, SUGGESTIONS_PER_GROUP)
      .map((item) => ({
        id: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        posterPath: item.posterPath,
        voteAverage: item.voteAverage,
        runtimeMinutes: item.runtimeMinutes,
        genreIds: item.genreIds,
        watchProviders: null,
        tmdbWatchPageUrl: null,
      }));
    const listed: MovieSearchItem[] = [...(watchlist.data ?? [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, SUGGESTIONS_PER_GROUP)
      .map((item) => ({
        id: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        posterPath: item.posterPath,
        voteAverage: item.voteAverage ?? null,
        runtimeMinutes: item.runtimeMinutes ?? null,
        genreIds: item.genreIds,
        watchProviders: null,
        tmdbWatchPageUrl: null,
      }));
    return [
      { title: t('profile.edit.watchedSuggestions'), items: seen },
      { title: t('profile.edit.listSuggestions'), items: listed },
    ];
  }, [watched.data, watchlist.data, t]);
}

export default function ProfileEditFavorites({ user, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const favorites = user.favorites ?? [];
  const canAdd = favorites.length < FAVORITES_MAX;
  const suggestions = usePickerSuggestions(pickerOpen);
  useIdlePrefetch(SEARCH_CHUNKS);

  useEffect(() => {
    if (hash === `#${FAVORITES_ANCHOR}`)
      document.getElementById(FAVORITES_ANCHOR)?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const focusHeading = () => requestAnimationFrame(() => headingRef.current?.focus());

  const closePicker = () => {
    setPickerOpen(false);
    focusHeading();
  };

  const keep = (items: FavoriteTitle[]) => {
    queryClient.setQueryData<UserProfile | null>(queryKeys.auth.me, (current) =>
      current ? { ...current, favorites: items } : current
    );
    void queryClient.invalidateQueries({ queryKey: queryKeys.profile.publicAll });
    onSaved();
  };

  const removal = useMutation({
    mutationFn: (favorite: FavoriteTitle) => removeFavorite(favorite.tmdbId, favorite.mediaType),
    onMutate: () => setError(null),
    onSuccess: ({ items }) => {
      keep(items);
      focusHeading();
    },
    onError: () => setError(t('profile.favorites.settings.removeError')),
  });

  const add = async (item: MovieSearchItem) => {
    setError(null);
    try {
      const { items } = await addFavorite(toFavorite(item));
      keep(items);
      closePicker();
    } catch (err) {
      if (!ApiError.is(err) || err.reason !== API_ERROR_REASONS.favoritesLimitReached) throw err;
      setError(err.message);
      closePicker();
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    }
  };

  const emptySlots = Math.max(0, FAVORITES_MAX - favorites.length - (canAdd ? 1 : 0));

  return (
    <ProfileEditSection
      id={FAVORITES_ANCHOR}
      title={t('profile.edit.favorites')}
      headingRef={headingRef}
    >
      {user.isProfilePublic ? null : (
        <p className="hint">{t('profile.favorites.settings.privateHint')}</p>
      )}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className={styles.slots}>
        {favorites.map((favorite) => (
          <li key={`${favorite.mediaType}|${favorite.tmdbId}`} className={styles.slot}>
            <FavoritePoster posterPath={favorite.posterPath} />
            <span className={styles.label}>
              <span className={styles.title}>{favorite.title}</span>
              {favorite.mediaType === 'tv' ? (
                <Chip size="sm" tone="muted">
                  {t('movies.list.tvBadge')}
                </Chip>
              ) : null}
            </span>
            <IconButton
              ariaLabel={t('profile.favorites.settings.removeAria', { title: favorite.title })}
              tone="onPoster"
              shape="round"
              expandHitArea
              className={styles.remove}
              disabled={removal.isPending}
              onClick={() => removal.mutate(favorite)}
            >
              <X size={ICON_SIZE.md} aria-hidden />
            </IconButton>
          </li>
        ))}
        {canAdd ? (
          <li className={styles.slot}>
            <button
              type="button"
              className={styles.add}
              aria-label={t('profile.favorites.settings.add')}
              onClick={() => setPickerOpen(true)}
            >
              <Plus size={ICON_SIZE.lg} aria-hidden />
              <span>{t('profile.favorites.addSlot')}</span>
            </button>
          </li>
        ) : null}
        {Array.from({ length: emptySlots }, (_, index) => (
          <li key={`empty-${index}`} className={styles.slot} aria-hidden="true">
            <span className={styles.placeholder} />
          </li>
        ))}
      </ul>

      <ResponsiveDialog
        open={pickerOpen}
        title={t('profile.favorites.settings.add')}
        detail={t('profile.favorites.settings.count', {
          count: favorites.length,
          max: FAVORITES_MAX,
        })}
        onClose={closePicker}
        size="md"
        sheetSize="lg"
      >
        {pickerOpen && (
          <Suspense fallback={null}>
            <AddMovieForm
              onAddItem={add}
              onAdded={() => undefined}
              isItemAlreadyAdded={(item) =>
                favorites.some((favorite) => isSameFavorite(favorite, toFavorite(item)))
              }
              alreadyAddedLabel={t('profile.favorites.settings.alreadyAdded')}
              alreadyAddedHint={t('profile.favorites.settings.alreadyAddedHint')}
              addErrorLabel={t('profile.favorites.settings.addError')}
              searchPlaceholder={t('profile.favorites.settings.searchPlaceholder')}
              searchAriaLabel={t('profile.favorites.settings.searchLabel')}
              showWatchProviders={false}
              includeSeries
              flatResults
              hideAttribution
              suggestions={suggestions}
            />
          </Suspense>
        )}
      </ResponsiveDialog>
    </ProfileEditSection>
  );
}

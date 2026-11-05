import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Film, Plus } from 'lucide-react';
import { FAVORITES_ANCHOR } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { API_ERROR_REASONS, ApiError } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import type { MovieSearchItem } from '@/features/movies/api/moviesApi';
import { addFavorite, FAVORITES_MAX, removeFavorite } from '@/features/profile/api/profileApi';
import type { UserProfile } from '@/features/auth/types';
import type { FavoriteTitle } from '@/shared/types/movie';
import settings from '@/shared/components/SettingsSection.module.css';
import styles from './AccountFavoritesCard.module.css';

const loadAddMoviePanel = () => import('@/features/movies/components/AddMoviePanel');
const AddMoviePanel = lazy(loadAddMoviePanel);
const SEARCH_CHUNKS = [loadAddMoviePanel];

interface Props {
  user: UserProfile;
  onSaved: () => void;
}

function toFavorite(item: MovieSearchItem): FavoriteTitle {
  return {
    tmdbId: item.id,
    mediaType: item.mediaType ?? 'movie',
    title: item.title,
    year: item.year,
    posterPath: item.posterPath,
  };
}

function sameTitle(a: FavoriteTitle, b: FavoriteTitle): boolean {
  return a.tmdbId === b.tmdbId && a.mediaType === b.mediaType;
}

function FavoriteThumb({ posterPath }: Readonly<{ posterPath: string | null }>) {
  const raw = posterImageSrc(posterPath);
  const src = raw ? tmdbPosterSrcForListDisplay(raw) : undefined;
  if (src) return <img src={src} alt="" className={styles.thumb} loading="lazy" />;
  return (
    <span className={clsx(styles.thumb, styles.thumbEmpty)} aria-hidden>
      <Film size={ICON_SIZE.lg} />
    </span>
  );
}

export default function AccountFavoritesCard({ user, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const queryClient = useQueryClient();
  const headingId = useId();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const favorites = user.favorites ?? [];
  const canAdd = favorites.length < FAVORITES_MAX;
  useIdlePrefetch(SEARCH_CHUNKS);

  useEffect(() => {
    if (hash === `#${FAVORITES_ANCHOR}`)
      document.getElementById(FAVORITES_ANCHOR)?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const focusHeading = () => requestAnimationFrame(() => headingRef.current?.focus());

  const closeSearch = () => {
    setSearchOpen(false);
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
      if (items.length >= FAVORITES_MAX) closeSearch();
    } catch (err) {
      if (!ApiError.is(err) || err.reason !== API_ERROR_REASONS.favoritesLimitReached) throw err;
      setError(err.message);
      closeSearch();
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    }
  };

  return (
    <Card
      as="section"
      id={FAVORITES_ANCHOR}
      aria-labelledby={headingId}
      padding="none"
      elevation="sm"
      className={clsx(settings.card, styles.card)}
    >
      <div className={clsx(settings.row, settings.noDivider)}>
        <div className={settings.rowMain}>
          <h3
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className={clsx(settings.rowLabel, styles.heading)}
          >
            {t('profile.favorites.settings.title')}
          </h3>
          <p className={settings.rowSub}>
            {user.isProfilePublic
              ? t('profile.favorites.settings.hint')
              : t('profile.favorites.settings.privateHint')}
          </p>
        </div>
        <span className={styles.count}>
          {t('profile.favorites.settings.count', { count: favorites.length, max: FAVORITES_MAX })}
        </span>
      </div>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {favorites.length === 0 ? (
        <p className={clsx(settings.rowSub, styles.line)}>
          {t('profile.favorites.settings.empty')}
        </p>
      ) : (
        <ul className={styles.list}>
          {favorites.map((favorite) => (
            <li key={`${favorite.mediaType}|${favorite.tmdbId}`} className={styles.item}>
              <FavoriteThumb posterPath={favorite.posterPath} />
              <div className={styles.text}>
                <p className={clsx(settings.rowLabel, styles.title)}>{favorite.title}</p>
                <p className={clsx(settings.rowSub, styles.meta)}>
                  {favorite.year}
                  {favorite.mediaType === 'tv' ? (
                    <Chip size="sm" tone="muted">
                      {t('movies.list.tvBadge')}
                    </Chip>
                  ) : null}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                aria-label={t('profile.favorites.settings.removeAria', { title: favorite.title })}
                disabled={removal.isPending}
                onClick={() => removal.mutate(favorite)}
              >
                {t('profile.favorites.settings.remove')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {canAdd ? (
        <div className={styles.footer}>
          {searchOpen ? (
            <Suspense fallback={null}>
              <AddMoviePanel
                open
                onOpenChange={setSearchOpen}
                hideTrigger
                returnFocusRef={addButtonRef}
                triggerLabel={t('profile.favorites.settings.add')}
                panelTitle={t('profile.favorites.settings.add')}
                onAdded={() => undefined}
                onAddItem={add}
                isItemAlreadyAdded={(item) =>
                  favorites.some((favorite) => sameTitle(favorite, toFavorite(item)))
                }
                alreadyAddedLabel={t('profile.favorites.settings.alreadyAdded')}
                alreadyAddedHint={t('profile.favorites.settings.alreadyAddedHint')}
                addErrorLabel={t('profile.favorites.settings.addError')}
                searchPlaceholder={t('profile.favorites.settings.searchPlaceholder')}
                searchAriaLabel={t('profile.favorites.settings.searchLabel')}
                showWatchProviders={false}
                includeSeries
              />
            </Suspense>
          ) : (
            <Button ref={addButtonRef} type="button" size="sm" onClick={() => setSearchOpen(true)}>
              <Plus size={ICON_SIZE.md} aria-hidden />
              {t('profile.favorites.settings.add')}
            </Button>
          )}
        </div>
      ) : (
        <p className={clsx(settings.rowSub, styles.line)}>{t('profile.favorites.settings.full')}</p>
      )}
    </Card>
  );
}

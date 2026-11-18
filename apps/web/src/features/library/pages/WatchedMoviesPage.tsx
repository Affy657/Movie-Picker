import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Clapperboard, Eye } from 'lucide-react';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';
import type { RatingScale } from '@/shared/types/theme';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { syncsWithLetterboxd } from '@/features/auth/utils/letterboxdSync';
import { watchlistItemKey as itemKey } from '@/features/movies/utils/watchlistItemKey';
import OwnerRatingBadge, { ProfileCardBadge } from '@/features/movies/components/OwnerRatingBadge';
import ListMoviesPage from '@/features/library/components/ListMoviesPage';
import type { WatchlistSortConfig } from '@/features/library/components/WatchlistToolbar';
import { useWatchlistToggle } from '@/features/library/hooks/useWatchlistToggle';
import { useCollectionVisibility } from '@/features/library/hooks/useCollectionVisibility';
import CollectionVisibilityMenu from '@/features/library/components/CollectionVisibilityMenu';
import type {
  ToolbarExtraFilter,
  WatchlistEntry,
} from '@/features/library/hooks/useWatchlistToolbar';
import type { WatchedMovie, WatchedSource } from '@/features/library/api/watchedApi';
import {
  useMarkWatched,
  useUnmarkWatched,
  useWatchedMovies,
} from '@/features/library/hooks/useWatched';
import { watchedCountLabel } from '@/features/library/utils/watchedCount';

type SourceScope = 'all' | WatchedSource;

const NO_MOVIES: WatchedMovie[] = [];

function toEntry(movie: WatchedMovie): WatchlistEntry {
  return { ...movie, createdAt: movie.watchedAt };
}

function WatchedBadges({
  movie,
  scale,
}: Readonly<{ movie: WatchedMovie | undefined; scale: RatingScale }>) {
  const { t } = useTranslation();
  if (!movie) return null;
  const rated = movie.myRating != null;
  const night = movie.source === 'night';
  if (!rated && !night) return null;
  return (
    <>
      {rated ? <OwnerRatingBadge value={movie.myRating ?? 0} scale={scale} /> : null}
      {night ? (
        <ProfileCardBadge
          description={t('watched.page.nightBadgeAria')}
          icon={<Clapperboard size={ICON_SIZE.xs} aria-hidden />}
        >
          {t('watched.page.nightBadge')}
        </ProfileCardBadge>
      ) : null}
    </>
  );
}

type ListMoviesCard = ComponentProps<typeof ListMoviesPage>['card'];

function watchedBadgesSlot(
  movieOf: (entry: WatchlistEntry) => WatchedMovie | undefined,
  scale: RatingScale
): ListMoviesCard['leadingBadge'] {
  return (entry) => <WatchedBadges movie={movieOf(entry)} scale={scale} />;
}

function SourceFilter({
  value,
  onChange,
  compact,
}: Readonly<{ value: SourceScope; onChange: (value: SourceScope) => void; compact: boolean }>) {
  const { t } = useTranslation();
  const options = useMemo(
    () => [
      { value: 'all' as const, label: t('watched.page.sourceAll') },
      { value: 'night' as const, label: t('watched.page.sourceNight') },
      { value: 'elsewhere' as const, label: t('watched.page.sourceElsewhere') },
    ],
    [t]
  );
  return (
    <SegmentedRadioGroup
      id="watched-source"
      options={options}
      value={value}
      onChange={onChange}
      ariaLabel={t('watched.page.sourceLabel')}
      size={compact ? 'sm' : 'md'}
    />
  );
}

export default function WatchedMoviesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  useNoindexPage(pageTitle(t('watched.title')), ROUTES.watchedMovies);

  const watchedQuery = useWatchedMovies({ enabled: !!user });
  const watchlistToggle = useWatchlistToggle(!!user);
  const visibility = useCollectionVisibility('isWatchedPublic');
  const markWatched = useMarkWatched();
  const unmarkWatched = useUnmarkWatched();
  const [source, setSource] = useState<SourceScope>('all');
  const [removeError, setRemoveError] = useState<string | null>(null);
  const scale = user?.ratingScale ?? 'five';

  const movies = watchedQuery.data?.items ?? NO_MOVIES;
  const moviesByKey = useMemo(
    () => new Map(movies.map((movie) => [itemKey(movie.tmdbId, movie.mediaType), movie])),
    [movies]
  );
  const entries = useMemo(() => movies.map(toEntry), [movies]);
  const movieOf = (entry: WatchlistEntry) =>
    moviesByKey.get(itemKey(entry.tmdbId, entry.mediaType));

  const sorts = useMemo<WatchlistSortConfig>(
    () => ({
      keys: ['createdAt', 'title', 'year'],
      labels: { createdAt: t('watched.page.sortWatchedAt'), year: t('watched.page.sortYear') },
    }),
    [t]
  );

  const scopeFilter = useMemo<ToolbarExtraFilter & { control: ReactNode }>(
    () => ({
      control: <SourceFilter value={source} onChange={setSource} compact={isMobile} />,
      matches: (entry) =>
        source === 'all' ||
        moviesByKey.get(itemKey(entry.tmdbId, entry.mediaType))?.source === source,
      active: source !== 'all',
      reset: () => setSource('all'),
    }),
    [source, isMobile, moviesByKey]
  );

  return (
    <ListMoviesPage
      title={t('watched.title')}
      subtitle={watchedQuery.data ? watchedCountLabel(watchedQuery.data.total, t) : null}
      items={entries}
      isLoading={watchedQuery.isPending}
      isError={watchedQuery.isError}
      storageScope="watched"
      emptyIcon={<Eye aria-hidden size={ICON_SIZE['3xl']} />}
      header={{
        letterboxdSynced: syncsWithLetterboxd(user, 'watched'),
        menu: visibility.ready ? (
          <CollectionVisibilityMenu isPublic={visibility.isPublic} onChange={visibility.change} />
        ) : null,
      }}
      labels={{
        listAria: t('watched.page.listAria'),
        loading: t('watched.page.loading'),
        loadError: t('watched.page.loadError'),
        addPanelTitle: t('watched.page.addPanelTitle'),
        addTrigger: t('watched.page.addTrigger'),
        addTriggerShort: t('watched.page.addTriggerShort'),
        addSearchLabel: t('watched.page.addSearchLabel'),
        addSearchPlaceholder: t('watched.page.addSearchPlaceholder'),
        addError: t('watched.errors.mark'),
        alreadyAdded: t('watched.page.alreadyAdded'),
        searchLabel: t('watched.page.searchLabel'),
        searchPlaceholder: t('watched.page.searchPlaceholder'),
        searchPlaceholderShort: t('watched.page.searchPlaceholderShort'),
        emptyTitle: t('watched.page.emptyTitle'),
        emptyMessage: t('watched.page.emptyMessage'),
      }}
      toolbarOptions={{ sorts, scopeFilter }}
      card={{
        inWatchlist: (entry) => watchlistToggle.has(entry),
        showListBadge: false,
        onToggleWatchlist: (entry) => watchlistToggle.toggle(entry),
        leadingBadge: watchedBadgesSlot(movieOf, scale),
        canRemove: (entry) => movieOf(entry)?.source === 'elsewhere',
        removeLabels: {
          label: t('watched.page.remove'),
          ariaLabel: (title) => t('watched.page.removeFor', { title }),
        },
        onRemoveFromList: (entry) => {
          setRemoveError(null);
          unmarkWatched.mutate(
            { tmdbId: entry.tmdbId, mediaType: entry.mediaType },
            {
              onError: (error) =>
                setRemoveError(getErrorMessage(error, t('watched.errors.unmark'))),
            }
          );
        },
        error: removeError ?? visibility.error ?? watchlistToggle.error,
      }}
      onAddItem={async (item) => {
        await markWatched.mutateAsync({
          tmdbId: item.id,
          mediaType: item.mediaType ?? 'movie',
          title: item.title,
          year: item.year,
          posterPath: item.posterPath,
          voteAverage: item.voteAverage,
          runtimeMinutes: item.runtimeMinutes,
          genreIds: item.genreIds,
        });
      }}
      isItemAlreadyAdded={(item) => moviesByKey.has(itemKey(item.id, item.mediaType))}
    />
  );
}

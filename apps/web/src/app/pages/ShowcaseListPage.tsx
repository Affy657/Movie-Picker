import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import PageLayout from '@/shared/components/PageLayout';
import Button from '@/shared/components/Button';
import { ROUTES } from '@/app/routes';
import { getErrorMessage } from '@/shared/api/apiError';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useRecommendationSeed } from '@/app/pages/home/usePersonalRows';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useLocale, useTranslation, type TranslationKey } from '@/shared/i18n';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import MovieDetailsModal from '@/features/movies/components/MovieDetailsModal';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import ActiveFilterChips from '@/features/movies/components/ActiveFilterChips';
import CollectionToolbar from '@/features/movies/components/CollectionToolbar';
import MovieListFiltersPanel from '@/features/movies/components/MovieListFiltersPanel';
import FilteredCollectionLayout, {
  FilterSheet,
  FilteredEmptyState,
  toCollectionToolbarProps,
} from '@/features/movies/components/FilteredCollectionLayout';
import MovieBrowseCard from '@/features/movies/components/MovieBrowseCard';
import listCardStyles from '@/features/movies/components/MovieListCard.module.css';
import { useMovieListToolbar } from '@/features/movies/hooks/useMovieListToolbar';
import { useMovieCollections, useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import { searchMovies } from '@/features/movies/api/moviesApi';
import type {
  ShowcaseProvider,
  ShowcaseQuery,
  ShowcaseSection,
  ShowcaseTheme,
} from '@/features/movies/api/showcaseApi';
import {
  isShowcaseProvider,
  isShowcaseTheme,
  PROVIDER_LABEL_KEYS,
  THEME_LABEL_KEYS,
  type ShowcaseListVariant,
} from '@/features/movies/showcaseSections';

export type { ShowcaseListVariant };
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useWatchlist,
} from '@/features/watchlist/hooks/useWatchlist';
import ProposeToEventModal from '@/features/watchlist/components/ProposeToEventModal';
import ShowcaseListStates from './ShowcaseListStates';
import type { MovieMediaType } from '@/shared/types/movie';
import styles from './ShowcaseListPage.module.css';
import { collectionDisplayName } from '@/features/movies/utils/collectionName';

interface ShowcaseListItem {
  tmdbId: number;
  title: string;
  year: string;
  posterPath: string | null;
  genreIds: number[];
  mediaType: MovieMediaType;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  order: number;
  rank: number | null;
}

function watchlistKey(tmdbId: number, mediaType: string): string {
  return `${tmdbId}|${mediaType}`;
}

const TITLE_KEYS: Record<ShowcaseListVariant, TranslationKey> = {
  trending: 'showcase.sections.trendingTitle',
  'now-playing': 'showcase.sections.nowPlayingTitle',
  'most-proposed': 'showcase.sections.mostProposedTitle',
  theme: 'showcase.sections.themeTitle',
  collection: 'showcase.sections.collectionsTitle',
  provider: 'showcase.sections.providerTitle',
  recommendations: 'showcase.sections.recommendationsTitle',
  search: 'showcase.sections.searchTitle',
};

const SUBTITLE_KEYS: Record<ShowcaseListVariant, TranslationKey> = {
  trending: 'showcase.sections.trendingSubtitle',
  'now-playing': 'showcase.sections.nowPlayingSubtitle',
  'most-proposed': 'showcase.sections.mostProposedSubtitle',
  theme: 'showcase.sections.themeSubtitle',
  collection: 'showcase.sections.collectionsSubtitle',
  provider: 'showcase.sections.providerSubtitle',
  recommendations: 'showcase.sections.recommendationsSubtitle',
  search: 'showcase.sections.searchSubtitle',
};

const CANONICAL_PATHS: Partial<Record<ShowcaseListVariant, string>> = {
  trending: ROUTES.showcaseTrending,
  'now-playing': ROUTES.showcaseNowPlaying,
  'most-proposed': ROUTES.showcaseMostProposed,
};

interface Props {
  variant: ShowcaseListVariant;
}

type ShowcaseRouteSelection = {
  themeKey: ShowcaseTheme | undefined;
  providerKey: ShowcaseProvider | undefined;
  seedTmdbId: number | undefined;
  collectionId: number | undefined;
  genreId: number | undefined;
};

function buildShowcaseQuery(
  variant: Props['variant'],
  { themeKey, providerKey, seedTmdbId, collectionId, genreId }: ShowcaseRouteSelection
): ShowcaseQuery {
  if (variant === 'recommendations') return { section: 'recommendations', seedTmdbId };
  if (variant === 'provider') return { section: 'provider', provider: providerKey };
  if (variant === 'theme') return { section: 'theme', theme: themeKey };
  if (variant === 'collection') return { section: 'collection', collectionId };
  if (variant === 'trending' && genreId) return { section: 'trending', genreIds: [genreId] };
  return { section: variant as ShowcaseSection };
}

function isShowcaseQueryEnabled(
  variant: Props['variant'],
  { themeKey, providerKey, seedTmdbId, collectionId }: ShowcaseRouteSelection
): boolean {
  if (variant === 'search') return false;
  if (variant === 'theme') return themeKey != null;
  if (variant === 'provider') return providerKey != null;
  if (variant === 'recommendations') return seedTmdbId != null && Number.isFinite(seedTmdbId);
  if (variant === 'collection') return collectionId != null && Number.isFinite(collectionId);
  return true;
}

type ShowcaseRouteInputs = {
  variant: ShowcaseListVariant;
  theme: string | undefined;
  provider: string | undefined;
  seedTmdbId: string | undefined;
  collectionId: string | undefined;
  genreParam: number;
};

function parseRouteSelection({
  variant,
  theme,
  provider,
  seedTmdbId,
  collectionId,
  genreParam,
}: ShowcaseRouteInputs): ShowcaseRouteSelection {
  const genreUsable = Number.isInteger(genreParam) && genreParam > 0;
  return {
    themeKey: isShowcaseTheme(theme) ? theme : undefined,
    providerKey: isShowcaseProvider(provider) ? provider : undefined,
    seedTmdbId: seedTmdbId ? Number(seedTmdbId) : undefined,
    collectionId: collectionId ? Number(collectionId) : undefined,
    genreId: variant === 'trending' && genreUsable ? genreParam : undefined,
  };
}

type ShowcaseRow =
  | NonNullable<ReturnType<typeof useMovieShowcase>['data']>['items'][number]
  | Awaited<ReturnType<typeof searchMovies>>['items'][number];

function toShowcaseListItems(rows: readonly ShowcaseRow[]): ShowcaseListItem[] {
  return rows.map((row, index) => ({
    tmdbId: row.id,
    title: row.title,
    year: row.year,
    posterPath: row.posterPath,
    genreIds: row.genreIds ?? [],
    mediaType: row.mediaType ?? 'movie',
    voteAverage: row.voteAverage,
    runtimeMinutes: 'runtimeMinutes' in row ? row.runtimeMinutes : null,
    order: index,
    rank: 'rank' in row && row.rank != null ? row.rank : null,
  }));
}

type Translate = ReturnType<typeof useTranslation>['t'];

function resolveHeading({
  variant,
  searchQuery,
  themeKey,
  providerKey,
  collectionName,
  t,
}: Readonly<{
  variant: ShowcaseListVariant;
  searchQuery: string;
  themeKey: ShowcaseTheme | undefined;
  providerKey: ShowcaseProvider | undefined;
  collectionName: string | undefined;
  t: Translate;
}>): string {
  if (variant === 'search' && searchQuery)
    return t('showcase.searchHeading', { query: searchQuery });
  if (variant === 'theme' && themeKey) return t(THEME_LABEL_KEYS[themeKey]);
  if (variant === 'provider' && providerKey) return t(PROVIDER_LABEL_KEYS[providerKey]);
  if (variant === 'collection' && collectionName) return collectionDisplayName(collectionName);
  return t(TITLE_KEYS[variant]);
}

function resolveSubtitle({
  variant,
  genreId,
  tmdbLanguage,
  seedTitle,
  t,
}: Readonly<{
  variant: ShowcaseListVariant;
  genreId: number | undefined;
  tmdbLanguage: string;
  seedTitle: string | undefined;
  t: Translate;
}>): string {
  if (genreId) return genreLabel(genreId, tmdbLanguage);
  if (variant === 'recommendations' && seedTitle) return seedTitle;
  return t(SUBTITLE_KEYS[variant]);
}

export default function ShowcaseListPage({ variant }: Readonly<Props>) {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user } = useAuth();
  const params = useParams<{
    theme?: string;
    collectionId?: string;
    provider?: string;
    seedTmdbId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const isLoggedIn = !!user;
  const isMobile = useIsMobile();
  const hasHover = useHasHoverCapability();
  const filtersPanelId = useId();
  const recommendationSeed = useRecommendationSeed(isLoggedIn && variant === 'recommendations');

  const searchQuery = (searchParams.get('q') ?? '').trim();
  const genreParam = Number(searchParams.get('genre'));
  const { theme, provider, seedTmdbId: seedParam, collectionId: collectionParam } = params;

  const routeSelection: ShowcaseRouteSelection = useMemo(
    () =>
      parseRouteSelection({
        variant,
        theme,
        provider,
        seedTmdbId: seedParam,
        collectionId: collectionParam,
        genreParam,
      }),
    [variant, theme, provider, seedParam, collectionParam, genreParam]
  );
  const { themeKey, providerKey, collectionId, genreId } = routeSelection;

  const showcaseQuery: ShowcaseQuery = useMemo(
    () => buildShowcaseQuery(variant, routeSelection),
    [variant, routeSelection]
  );

  const showcaseEnabled = isShowcaseQueryEnabled(variant, routeSelection);
  const searchEnabled = variant === 'search' && searchQuery.length > 0;
  const queryEnabled = variant === 'search' ? searchEnabled : showcaseEnabled;

  const showcase = useMovieShowcase(showcaseQuery, showcaseEnabled);
  const collections = useMovieCollections(variant === 'collection');
  const collectionName = collections.data?.items.find((row) => row.id === collectionId)?.name;

  const search = useQuery({
    queryKey: ['movies', 'search-page', searchQuery] as const,
    queryFn: ({ signal }) => searchMovies(searchQuery, { signal }),
    enabled: searchEnabled,
  });

  const source = variant === 'search' ? search : showcase;

  const items = useMemo<ShowcaseListItem[]>(
    () =>
      toShowcaseListItems(
        variant === 'search' ? (search.data?.items ?? []) : (showcase.data?.items ?? [])
      ),
    [variant, search.data, showcase.data]
  );

  const mediaTypeLabels = useMemo(
    () => ({
      movie: t('watchlist.toolbar.filterTypeMovie'),
      tv: t('watchlist.toolbar.filterTypeTv'),
    }),
    [t]
  );

  const comparePrimary = useCallback(
    (a: ShowcaseListItem, b: ShowcaseListItem) => b.order - a.order,
    []
  );

  const toolbar = useMovieListToolbar({ items, tmdbLanguage, mediaTypeLabels, comparePrimary });
  const filtersPanelRef = useRef<HTMLDivElement>(null);
  useClickOutside(
    filtersPanelRef,
    () => toolbar.setFiltersOpen(false),
    toolbar.filtersOpen && !isMobile,
    '[data-filters-toggle]'
  );

  const filtersLabels = useMemo(
    () => ({
      genre: t('watchlist.toolbar.filterGenre'),
      type: t('watchlist.toolbar.filterType'),
      typeMovie: t('watchlist.toolbar.filterTypeMovie'),
      typeTv: t('watchlist.toolbar.filterTypeTv'),
      decade: t('watchlist.toolbar.filterDecade'),
      resetAll: t('profile.movies.toolbar.filtersResetAll'),
    }),
    [t]
  );

  const [detailsTarget, setDetailsTarget] = useState<ShowcaseListItem | null>(null);
  const [proposeTarget, setProposeTarget] = useState<ShowcaseListItem | null>(null);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const watchlistQuery = useWatchlist({ enabled: isLoggedIn });
  const watchlistKeys = useMemo(
    () => new Set((watchlistQuery.data ?? []).map((i) => watchlistKey(i.tmdbId, i.mediaType))),
    [watchlistQuery.data]
  );
  const { mutate: addToWatchlist } = useAddToWatchlist({
    onError: (err) => setWatchlistError(getErrorMessage(err, t('watchlist.card.addError'))),
  });
  const { mutate: removeFromWatchlist } = useRemoveFromWatchlist({
    onError: (err) => setWatchlistError(getErrorMessage(err, t('watchlist.card.removeError'))),
  });

  const handleToggleWatchlist = (item: ShowcaseListItem) => {
    setWatchlistError(null);
    if (watchlistKeys.has(watchlistKey(item.tmdbId, item.mediaType))) {
      removeFromWatchlist({ tmdbId: item.tmdbId, mediaType: item.mediaType });
    } else {
      addToWatchlist({
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        posterPath: item.posterPath,
      });
    }
  };

  const headingText = resolveHeading({
    variant,
    searchQuery,
    themeKey,
    providerKey,
    collectionName,
    t,
  });

  const subtitleText = resolveSubtitle({
    variant,
    genreId,
    tmdbLanguage,
    seedTitle: recommendationSeed.seedTitle,
    t,
  });

  const canonicalPath = CANONICAL_PATHS[variant];
  usePageSeo({
    title: pageTitle(headingText),
    description: t(SUBTITLE_KEYS[variant]),
    canonical: canonicalPath ? absoluteUrl(canonicalPath) : undefined,
    noindex: canonicalPath == null,
  });

  const activeFilterCount = toolbar.activeFilterChips.length;
  const totalCount = items.length;

  const filtersPanel = (
    <MovieListFiltersPanel
      panelId={filtersPanelId}
      tmdbLanguage={tmdbLanguage}
      labels={filtersLabels}
      selectedGenres={toolbar.selectedGenres}
      onToggleGenre={toolbar.toggleGenre}
      selectedMediaTypes={toolbar.selectedMediaTypes}
      onToggleMediaType={toolbar.toggleMediaType}
      selectedDecade={toolbar.selectedDecade}
      onToggleDecade={toolbar.toggleDecade}
      onReset={isMobile ? undefined : toolbar.clearAllFilters}
    />
  );

  return (
    <PageLayout className={styles.layout}>
      <Link to={ROUTES.home} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        <span>{t('showcase.backToHome')}</span>
      </Link>

      <div className={styles.headerText}>
        <h1 className={styles.pageTitle}>{headingText}</h1>
        <p className={styles.pageSubtitle}>{subtitleText}</p>
      </div>

      <h2 className="visually-hidden">{t('showcase.sectionsHeading')}</h2>

      {watchlistError ? (
        <p className="error" role="alert">
          {watchlistError}
        </p>
      ) : null}

      <ShowcaseListStates
        variant={variant}
        queryEnabled={queryEnabled}
        isPending={source.isPending}
        isError={source.isError}
        totalCount={totalCount}
        onRetry={() => void source.refetch()}
      />

      {queryEnabled && !source.isError && totalCount > 0 ? (
        <FilteredCollectionLayout
          toolbar={
            <CollectionToolbar
              {...toCollectionToolbarProps(toolbar, {
                filtersPanelId,
                activeFilterCount,
                isMobile,
              })}
              sortOptions={[
                { key: 'primary', label: t('showcase.toolbar.sortRelevance') },
                { key: 'title', label: t('profile.movies.toolbar.sortTitle') },
                { key: 'year', label: t('profile.movies.toolbar.sortYear') },
              ]}
              labels={{
                searchLabel: t('showcase.toolbar.searchLabel'),
                searchPlaceholder: t('showcase.toolbar.searchPlaceholder'),
                filtersToggleAriaLabel: t('profile.movies.toolbar.filtersToggleAria'),
                filtersLabel: t('profile.movies.toolbar.filtersLabel'),
                sortLabel: t('profile.movies.toolbar.sortLabel'),
                sortMenuAriaLabel: t('profile.movies.toolbar.sortMenuAria'),
                sortDirectionAscLabel: t('profile.movies.toolbar.sortDirectionAsc'),
                sortDirectionDescLabel: t('profile.movies.toolbar.sortDirectionDesc'),
                resultCountText: toolbar.isFiltered
                  ? t('showcase.filteredCount', {
                      shown: toolbar.visibleCount,
                      total: toolbar.totalCount,
                    })
                  : pluralizeCount(
                      toolbar.totalCount,
                      'showcase.resultCountOne',
                      'showcase.resultCount',
                      t
                    ),
                clearAllLabel: t('profile.movies.toolbar.clearAll'),
              }}
            />
          }
          desktopFilters={
            toolbar.filtersOpen && !isMobile ? (
              <div ref={filtersPanelRef}>{filtersPanel}</div>
            ) : null
          }
          chips={
            activeFilterCount > 0 ? (
              <ActiveFilterChips
                chips={toolbar.activeFilterChips}
                groupAriaLabel={t('watchlist.filter.toggleAria')}
                removeAriaLabel={t('profile.movies.toolbar.removeFilterAria')}
              />
            ) : null
          }
          mobileSheet={
            isMobile ? (
              <FilterSheet
                open={toolbar.filtersOpen}
                title={t('profile.movies.toolbar.filtersSheetTitle')}
                onClose={() => toolbar.setFiltersOpen(false)}
                resetLabel={t('profile.movies.toolbar.filtersReset')}
                applyLabel={pluralizeCount(
                  toolbar.visibleCount,
                  'profile.movies.toolbar.filtersApplyOne',
                  'profile.movies.toolbar.filtersApply',
                  t
                )}
                onReset={toolbar.clearAllFilters}
              >
                {filtersPanel}
              </FilterSheet>
            ) : null
          }
          emptyFiltered={
            toolbar.visibleItems.length === 0 ? (
              <FilteredEmptyState
                title={t('profile.movies.toolbar.emptyTitle')}
                message={t('profile.movies.toolbar.emptyMessage')}
                resetLabel={t('profile.movies.toolbar.filtersResetAll')}
                onReset={toolbar.resetAll}
              />
            ) : null
          }
        >
          <ul className={styles.grid} aria-label={t('showcase.sectionsHeading')}>
            {toolbar.revealedItems.map((item) => (
              <MovieBrowseCard
                key={`${item.tmdbId}|${item.mediaType}`}
                item={item}
                hasHover={hasHover}
                isLoggedIn={isLoggedIn}
                inWatchlist={watchlistKeys.has(watchlistKey(item.tmdbId, item.mediaType))}
                onToggleWatchlist={() => handleToggleWatchlist(item)}
                onOpenDetails={() => setDetailsTarget(item)}
                onProposeFallback={() => setProposeTarget(item)}
                openDetailsAriaLabel={t('profile.movies.card.openDetailsAria', {
                  title: item.title,
                })}
                ratingScale={user?.ratingScale}
                leadingBadge={
                  item.rank != null ? (
                    <span className={clsx(listCardStyles.badge, listCardStyles.badgeStacked)}>
                      {t('showcase.rank', { rank: item.rank })}
                    </span>
                  ) : undefined
                }
                t={t}
              />
            ))}
          </ul>
          {toolbar.remainingCount > 0 && (
            <Button className={styles.loadMoreBtn} onClick={toolbar.revealMore}>
              {t(
                toolbar.remainingCount === 1
                  ? 'profile.movies.loadMoreOne'
                  : 'profile.movies.loadMore',
                { count: toolbar.remainingCount }
              )}
            </Button>
          )}
        </FilteredCollectionLayout>
      ) : null}

      {detailsTarget && (
        <MovieDetailsModal
          open={!!detailsTarget}
          title={detailsTarget.title}
          year={detailsTarget.year}
          tmdbId={detailsTarget.tmdbId}
          mediaType={detailsTarget.mediaType}
          posterSrc={posterImageSrc(detailsTarget.posterPath)}
          onClose={() => setDetailsTarget(null)}
        />
      )}

      {proposeTarget && (
        <ProposeToEventModal
          open={!!proposeTarget}
          movie={proposeTarget}
          onClose={() => setProposeTarget(null)}
        />
      )}
    </PageLayout>
  );
}

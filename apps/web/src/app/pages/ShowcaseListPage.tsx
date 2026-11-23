import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import PageLayout from '@/shared/components/PageLayout';
import Button from '@/shared/components/Button';
import { ROUTES } from '@/app/routes';
import { MOVIE_PAGE_CHUNKS } from '@/app/moviePageChunk';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useRecommendationSeed } from '@/app/pages/home/usePersonalRows';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useLocale, useTranslation, type TranslationKey, type Translate } from '@/shared/i18n';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import CollectionToolbar, {
  type CollectionToolbarLabels,
} from '@/features/movies/components/CollectionToolbar';
import { toCollectionToolbarProps } from '@/features/movies/components/FilteredCollectionLayout';
import MovieListFilteredLayout from '@/features/movies/components/MovieListFilteredLayout';
import MovieBrowseCard from '@/features/movies/components/MovieBrowseCard';
import listCardStyles from '@/features/movies/components/ShowcaseMovieCard.module.css';
import { useCatalogToolbar } from '@/features/movies/hooks/useCatalogToolbar';
import { useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import { searchMovies } from '@/features/movies/api/moviesApi';
import type {
  ShowcaseProvider,
  ShowcaseQuery,
  ShowcaseSection,
} from '@/features/movies/api/showcaseApi';
import {
  isShowcaseProvider,
  PROVIDER_LABEL_KEYS,
  type ShowcaseListVariant,
} from '@/features/movies/showcaseSections';

export type { ShowcaseListVariant };
import {
  useWatchlistToggle,
  type WatchlistToggleItem,
} from '@/features/library/hooks/useWatchlistToggle';
import ProposeToEventModal from '@/features/events/components/ProposeToEventModal';
import { useOpenMoviePage } from '@/features/movies/hooks/useOpenMoviePage';
import ShowcaseListStates from './ShowcaseListStates';
import { readShowcaseListArrival } from './showcaseListState';
import type { MovieMediaType, TitleSummary } from '@/shared/types/movie';
import { toTitleSummary } from '@/shared/utils/titleSummary';
import styles from './ShowcaseListPage.module.css';
import BackLink from '@/shared/components/BackLink';

interface ShowcaseListItem extends TitleSummary {
  genreIds: number[];
  order: number;
  rank: number | null;
}

const FIRST_ROW_EAGER_COUNT = 3;

const TITLE_KEYS: Record<ShowcaseListVariant, TranslationKey> = {
  trending: 'showcase.sections.trendingTitle',
  'now-playing': 'showcase.sections.nowPlayingTitle',
  'most-proposed': 'showcase.sections.mostProposedTitle',
  provider: 'showcase.sections.providerTitle',
  recommendations: 'showcase.sections.similarMoviesTitle',
  search: 'showcase.sections.searchTitle',
};

const SUBTITLE_KEYS: Record<ShowcaseListVariant, TranslationKey> = {
  trending: 'showcase.sections.trendingSubtitle',
  'now-playing': 'showcase.sections.nowPlayingSubtitle',
  'most-proposed': 'showcase.sections.mostProposedSubtitle',
  provider: 'showcase.sections.providerSubtitle',
  recommendations: 'showcase.sections.similarSubtitle',
  search: 'showcase.sections.searchSubtitle',
};

const SEO_DESCRIPTION_KEYS: Partial<Record<ShowcaseListVariant, TranslationKey>> = {
  trending: 'showcase.seo.trendingDescription',
  'now-playing': 'showcase.seo.nowPlayingDescription',
  'most-proposed': 'showcase.seo.mostProposedDescription',
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
  providerKey: ShowcaseProvider | undefined;
  seedTmdbId: number | undefined;
  seedMediaType: MovieMediaType;
  genreId: number | undefined;
};

function buildShowcaseQuery(
  variant: Props['variant'],
  { providerKey, seedTmdbId, seedMediaType, genreId }: ShowcaseRouteSelection
): ShowcaseQuery {
  if (variant === 'recommendations')
    return { section: 'recommendations', seedTmdbId, seedMediaType };
  if (variant === 'provider') return { section: 'provider', provider: providerKey };
  if (variant === 'trending' && genreId) return { section: 'trending', genreIds: [genreId] };
  return { section: variant as ShowcaseSection };
}

function isShowcaseQueryEnabled(
  variant: Props['variant'],
  { providerKey, seedTmdbId }: ShowcaseRouteSelection
): boolean {
  if (variant === 'search') return false;
  if (variant === 'provider') return providerKey != null;
  if (variant === 'recommendations') return seedTmdbId != null && Number.isFinite(seedTmdbId);
  return true;
}

type ShowcaseRouteInputs = {
  variant: ShowcaseListVariant;
  provider: string | undefined;
  seedTmdbId: string | undefined;
  seedType: string | null;
  genreParam: number;
};

function parseRouteSelection({
  variant,
  provider,
  seedTmdbId,
  seedType,
  genreParam,
}: ShowcaseRouteInputs): ShowcaseRouteSelection {
  const genreUsable = Number.isInteger(genreParam) && genreParam > 0;
  return {
    providerKey: isShowcaseProvider(provider) ? provider : undefined,
    seedTmdbId: seedTmdbId ? Number(seedTmdbId) : undefined,
    seedMediaType: seedType === 'tv' ? 'tv' : 'movie',
    genreId: variant === 'trending' && genreUsable ? genreParam : undefined,
  };
}

type ShowcaseRow =
  | NonNullable<ReturnType<typeof useMovieShowcase>['data']>['items'][number]
  | Awaited<ReturnType<typeof searchMovies>>['items'][number];

function toShowcaseListItems(rows: readonly ShowcaseRow[]): ShowcaseListItem[] {
  return rows.map((row, index) => ({
    ...toTitleSummary(row),
    genreIds: row.genreIds ?? [],
    runtimeMinutes: row.runtimeMinutes ?? null,
    order: index,
    rank: 'rank' in row && row.rank != null ? row.rank : null,
  }));
}

type RecommendationsSeed = {
  personalTitle: string | undefined;
  arrivalTitle: string | undefined;
  isTv: boolean;
};

function recommendationsHeading(
  { personalTitle, arrivalTitle, isTv }: RecommendationsSeed,
  t: Translate
): string {
  if (personalTitle) return t('showcase.sections.recommendationsTitle');
  if (arrivalTitle) {
    return t(isTv ? 'showcase.sections.similarShowsTo' : 'showcase.sections.similarMoviesTo', {
      title: arrivalTitle,
    });
  }
  return t(isTv ? 'showcase.sections.similarShowsTitle' : 'showcase.sections.similarMoviesTitle');
}

function resolveHeading({
  variant,
  searchQuery,
  providerKey,
  recommendationsSeed,
  t,
}: Readonly<{
  variant: ShowcaseListVariant;
  searchQuery: string;
  providerKey: ShowcaseProvider | undefined;
  recommendationsSeed: RecommendationsSeed;
  t: Translate;
}>): string {
  if (variant === 'search' && searchQuery)
    return t('showcase.searchHeading', { query: searchQuery });
  if (variant === 'provider' && providerKey) return t(PROVIDER_LABEL_KEYS[providerKey]);
  if (variant === 'recommendations') return recommendationsHeading(recommendationsSeed, t);
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

function seedTitleForRoute(
  seed: ReturnType<typeof useRecommendationSeed>,
  { seedTmdbId, seedMediaType }: ShowcaseRouteSelection
): string | undefined {
  const seedMatchesRoute = seed.seedTmdbId === seedTmdbId && seed.seedMediaType === seedMediaType;
  return seedMatchesRoute ? seed.seedTitle : undefined;
}

function showcaseToolbarLabels(
  toolbar: { isFiltered: boolean; visibleCount: number; totalCount: number },
  t: Translate
): CollectionToolbarLabels {
  return {
    searchLabel: t('showcase.toolbar.searchLabel'),
    searchPlaceholder: t('showcase.toolbar.searchPlaceholder'),
    filtersToggleAriaLabel: t('profile.movies.toolbar.filtersToggleAria'),
    filtersLabel: t('profile.movies.toolbar.filtersLabel'),
    sortLabel: t('profile.movies.toolbar.sortLabel'),
    sortMenuAriaLabel: t('profile.movies.toolbar.sortMenuAria'),
    sortDirectionAscLabel: t('profile.movies.toolbar.sortDirectionAsc'),
    sortDirectionDescLabel: t('profile.movies.toolbar.sortDirectionDesc'),
    resultCountText: toolbar.isFiltered
      ? t('showcase.filteredCount', { shown: toolbar.visibleCount, total: toolbar.totalCount })
      : pluralizeCount(toolbar.totalCount, 'showcase.resultCountOne', 'showcase.resultCount', t),
    clearAllLabel: t('profile.movies.toolbar.clearAll'),
  };
}

function rankBadge(rank: number | null, t: Translate): ReactNode {
  if (rank == null) return undefined;
  return (
    <span className={clsx(listCardStyles.badge, listCardStyles.badgeStacked)}>
      {t('showcase.rank', { rank })}
    </span>
  );
}

export default function ShowcaseListPage({ variant }: Readonly<Props>) {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user } = useAuth();
  const params = useParams<{ provider?: string; seedTmdbId?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const arrival = readShowcaseListArrival(location.state);
  const isLoggedIn = !!user;
  const isMobile = useIsMobile();
  const hasHover = useHasHoverCapability();
  const filtersPanelId = useId();
  const recommendationSeed = useRecommendationSeed(isLoggedIn && variant === 'recommendations');
  useIdlePrefetch(MOVIE_PAGE_CHUNKS);

  const searchQuery = (searchParams.get('q') ?? '').trim();
  const genreParam = Number(searchParams.get('genre'));
  const seedType = searchParams.get('type');
  const { provider, seedTmdbId: seedParam } = params;

  const routeSelection: ShowcaseRouteSelection = useMemo(
    () =>
      parseRouteSelection({
        variant,
        provider,
        seedTmdbId: seedParam,
        seedType,
        genreParam,
      }),
    [variant, provider, seedParam, seedType, genreParam]
  );
  const { providerKey, genreId } = routeSelection;

  const showcaseQuery: ShowcaseQuery = useMemo(
    () => buildShowcaseQuery(variant, routeSelection),
    [variant, routeSelection]
  );

  const isSearch = variant === 'search';
  const showcaseEnabled = isShowcaseQueryEnabled(variant, routeSelection);
  const searchEnabled = isSearch && searchQuery.length > 0;
  const queryEnabled = isSearch ? searchEnabled : showcaseEnabled;

  const showcase = useMovieShowcase(showcaseQuery, showcaseEnabled);

  const search = useQuery({
    queryKey: queryKeys.movies.searchPage(searchQuery),
    queryFn: ({ signal }) => searchMovies(searchQuery, { signal }),
    enabled: searchEnabled,
  });

  const source = isSearch ? search : showcase;
  const rows = source.data?.items;

  const items = useMemo<ShowcaseListItem[]>(() => toShowcaseListItems(rows ?? []), [rows]);

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

  const toolbar = useCatalogToolbar({ items, tmdbLanguage, mediaTypeLabels, comparePrimary });

  const openMoviePage = useOpenMoviePage();
  const [proposeTarget, setProposeTarget] = useState<WatchlistToggleItem | null>(null);
  const watchlist = useWatchlistToggle(isLoggedIn);

  const personalSeedTitle = seedTitleForRoute(recommendationSeed, routeSelection);

  const headingText = resolveHeading({
    variant,
    searchQuery,
    providerKey,
    recommendationsSeed: {
      personalTitle: personalSeedTitle,
      arrivalTitle: arrival.seedTitle,
      isTv: routeSelection.seedMediaType === 'tv',
    },
    t,
  });

  const subtitleText = resolveSubtitle({
    variant,
    genreId,
    tmdbLanguage,
    seedTitle: personalSeedTitle,
    t,
  });

  const canonicalPath = CANONICAL_PATHS[variant];
  usePageSeo({
    title: pageTitle(headingText),
    description: t(SEO_DESCRIPTION_KEYS[variant] ?? SUBTITLE_KEYS[variant]),
    canonical: canonicalPath ? absoluteUrl(canonicalPath) : undefined,
    noindex: canonicalPath == null,
  });

  const activeFilterCount = toolbar.activeFilterChips.length;
  const totalCount = items.length;
  const hasResults = queryEnabled && !source.isError && totalCount > 0;

  return (
    <PageLayout className={styles.layout}>
      <BackLink to={ROUTES.home}>{t('showcase.backToHome')}</BackLink>

      <div className={styles.headerText}>
        <h1 className={styles.pageTitle}>{headingText}</h1>
        <p className={styles.pageSubtitle}>{subtitleText}</p>
      </div>

      <h2 className="visually-hidden">{t('showcase.sectionsHeading')}</h2>

      {watchlist.error ? (
        <p className="error" role="alert">
          {watchlist.error}
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

      {hasResults ? (
        <MovieListFilteredLayout
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
              labels={showcaseToolbarLabels(toolbar, t)}
            />
          }
          filters={toolbar}
          filtersPanelId={filtersPanelId}
          tmdbLanguage={tmdbLanguage}
          isMobile={isMobile}
        >
          <ul className={styles.grid} aria-label={t('showcase.sectionsHeading')}>
            {toolbar.revealedItems.map((item, index) => (
              <MovieBrowseCard
                key={`${item.tmdbId}|${item.mediaType}`}
                item={item}
                eager={index < FIRST_ROW_EAGER_COUNT}
                hasHover={hasHover}
                isLoggedIn={isLoggedIn}
                inWatchlist={watchlist.has(item)}
                onToggleWatchlist={() => watchlist.toggle(item)}
                onOpenDetails={() => openMoviePage(item)}
                onProposeToEvent={() => setProposeTarget(item)}
                ratingScale={user?.ratingScale}
                leadingBadge={rankBadge(item.rank, t)}
              />
            ))}
          </ul>
          {toolbar.remainingCount > 0 && (
            <Button className={styles.loadMoreBtn} onClick={toolbar.revealMore}>
              {pluralizeCount(
                toolbar.remainingCount,
                'profile.movies.loadMoreOne',
                'profile.movies.loadMore',
                t
              )}
            </Button>
          )}
        </MovieListFilteredLayout>
      ) : null}

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

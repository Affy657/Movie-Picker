import { useState } from 'react';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useLocale, useTranslation } from '@/shared/i18n';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import { ROUTES } from '@/app/routes';
import { MOVIE_PAGE_CHUNKS } from '@/app/routeChunks';
import { useHistoryEntryState } from '@/shared/hooks/useHistoryEntryState';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import type { MovieLibraryActions } from '@/features/movies/components/MovieBrowseCard';
import type { ShowcaseItem, ShowcaseProvider } from '@/features/movies/api/showcaseApi';
import {
  isShowcaseProvider,
  PROVIDER_KEYS,
  PROVIDER_LABEL_KEYS,
  TRENDING_GENRE_IDS,
} from '@/features/movies/showcaseSections';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  useWatchlistToggle,
  type WatchlistToggleItem,
} from '@/features/watchlist/hooks/useWatchlistToggle';
import ProposeToEventModal from '@/features/events/components/ProposeToEventModal';
import { useOpenMoviePage } from '@/features/movies/hooks/useOpenMoviePage';
import HomeHero from './home/HomeHero';
import HomeShowcaseRow from './home/HomeShowcaseRow';
import HomeCollectionsRow from './home/HomeCollectionsRow';
import HomeThemeFans from './home/HomeThemeFans';
import HomeForYou, { type PersonalRowItem } from './home/HomeForYou';
import HomeMostProposed from './home/HomeMostProposed';
import { useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import {
  useFriendsWatchedRow,
  useRecommendationSeed,
  useWatchlistRow,
} from './home/usePersonalRows';
import styles from './HomePage.module.css';

type GenreTabKey = 'all' | `${number}`;

const FIRST_RAIL_EAGER_COUNT = 3;

function isGenreTabKey(value: unknown): value is GenreTabKey {
  return value === 'all' || TRENDING_GENRE_IDS.some((id) => String(id) === value);
}

function isProviderTab(value: unknown): value is ShowcaseProvider {
  return typeof value === 'string' && isShowcaseProvider(value);
}

type HomeRail = 'forYou' | 'trending';

function resolveFirstRail(personalRowsPending: boolean, hasPersonal: boolean): HomeRail | null {
  if (personalRowsPending) return null;
  return hasPersonal ? 'forYou' : 'trending';
}

function eagerCountFor(rail: HomeRail, firstRail: HomeRail | null): number {
  return rail === firstRail ? FIRST_RAIL_EAGER_COUNT : 0;
}

export default function HomePage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const [genreTab, setGenreTab] = useHistoryEntryState('home.genreTab', 'all', isGenreTabKey);
  const [providerTab, setProviderTab] = useHistoryEntryState(
    'home.providerTab',
    PROVIDER_KEYS[0],
    isProviderTab
  );
  const openMoviePage = useOpenMoviePage();
  useIdlePrefetch(MOVIE_PAGE_CHUNKS);
  const [proposeTarget, setProposeTarget] = useState<WatchlistToggleItem | null>(null);

  usePageSeo({
    title: t('home.seoTitle'),
    description: t('home.seoDescription'),
    canonical: absoluteUrl(ROUTES.home),
    ogType: 'website',
  });

  const genreTabs = [
    { key: 'all' as GenreTabKey, label: t('showcase.allGenres') },
    ...TRENDING_GENRE_IDS.map((id) => ({
      key: String(id) as GenreTabKey,
      label: genreLabel(id, locale),
    })),
  ];

  const providerTabs = PROVIDER_KEYS.map((key) => ({ key, label: t(PROVIDER_LABEL_KEYS[key]) }));

  const isAuthenticated = !!user;
  const hasHover = useHasHoverCapability();
  const watchlist = useWatchlistToggle(isAuthenticated);
  const library: MovieLibraryActions = {
    hasHover,
    isLoggedIn: isAuthenticated,
    has: watchlist.has,
    toggle: watchlist.toggle,
    propose: setProposeTarget,
  };
  const watchlistRow = useWatchlistRow(isAuthenticated);
  const friendsRow = useFriendsWatchedRow(isAuthenticated);
  const {
    seedTmdbId,
    seedMediaType,
    seedTitle,
    isPending: seedPending,
  } = useRecommendationSeed(isAuthenticated);
  const personalPending = watchlistRow.isPending || friendsRow.isPending || seedPending;
  const firstRail = resolveFirstRail(
    personalPending,
    watchlistRow.items.length > 0 || !!seedTmdbId || friendsRow.items.length > 0
  );

  const openPersonalDetails = (item: PersonalRowItem) =>
    openMoviePage({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType ?? 'movie',
      title: item.title,
      year: item.year,
      posterPath: item.posterPath,
      voteAverage: item.voteAverage,
      runtimeMinutes: item.runtimeMinutes,
      genreIds: item.genreIds,
    });

  const selectedGenreIds = genreTab === 'all' ? undefined : [Number(genreTab)];
  const mostProposed = useMovieShowcase({ section: 'most-proposed' });
  const showMostProposed = !(mostProposed.isSuccess && mostProposed.data.items.length === 0);

  const openDetails = (item: ShowcaseItem) =>
    openMoviePage({
      tmdbId: item.id,
      mediaType: item.mediaType ?? 'movie',
      title: item.title,
      year: item.year,
      posterPath: item.posterPath,
      voteAverage: item.voteAverage,
      runtimeMinutes: item.runtimeMinutes,
      genreIds: item.genreIds,
    });

  return (
    <PageLayout className={styles.home}>
      <HomeHero />

      {watchlist.error ? (
        <p className="error" role="alert">
          {watchlist.error}
        </p>
      ) : null}

      <HomeForYou
        watchlist={watchlistRow.items}
        friends={friendsRow.items}
        seed={
          seedTmdbId ? { tmdbId: seedTmdbId, mediaType: seedMediaType, title: seedTitle } : null
        }
        isPending={personalPending}
        eagerCount={eagerCountFor('forYou', firstRail)}
        library={library}
        onSelectPersonal={openPersonalDetails}
        onSelectShowcase={openDetails}
      />
      <HomeShowcaseRow
        headingKey="showcase.sections.trendingTitle"
        seeAllTo={ROUTES.showcaseTrendingForGenre(selectedGenreIds?.[0])}
        query={{ section: 'trending', genreIds: selectedGenreIds }}
        layout="ranked"
        library={library}
        onSelect={openDetails}
        eagerCount={eagerCountFor('trending', firstRail)}
        tabConfig={{
          ariaLabel: t('showcase.genreLabel'),
          tabs: genreTabs,
          active: genreTab,
          onChange: setGenreTab,
        }}
      />
      <HomeShowcaseRow
        headingKey="showcase.sections.providerTitle"
        seeAllTo={ROUTES.showcaseProvider(providerTab)}
        query={{ section: 'provider', provider: providerTab }}
        library={library}
        onSelect={openDetails}
        tabConfig={{
          ariaLabel: t('showcase.providerLabel'),
          tabs: providerTabs,
          active: providerTab,
          onChange: setProviderTab,
        }}
      />
      <div className={showMostProposed ? styles.pair : undefined}>
        <HomeShowcaseRow
          headingKey="showcase.sections.nowPlayingTitle"
          seeAllTo={ROUTES.showcaseNowPlaying}
          query={{ section: 'now-playing' }}
          layout={showMostProposed ? 'grid' : 'rail'}
          library={library}
          onSelect={openDetails}
          className={showMostProposed ? styles.pairMain : undefined}
        />
        {showMostProposed ? (
          <HomeMostProposed onSelect={openDetails} className={styles.pairSide} />
        ) : null}
      </div>
      <HomeThemeFans />
      <HomeCollectionsRow />

      {proposeTarget ? (
        <ProposeToEventModal open movie={proposeTarget} onClose={() => setProposeTarget(null)} />
      ) : null}
    </PageLayout>
  );
}

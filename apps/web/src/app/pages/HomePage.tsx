import { useState } from 'react';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useLocale, useTranslation } from '@/shared/i18n';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import { ROUTES } from '@/app/routes';
import { loadMovieDetailsModal } from '@/features/movies/components/LazyMovieDetailsModal';
import { useIdlePrefetch } from '@/shared/hooks/useIdlePrefetch';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import type { MovieLibraryActions } from '@/features/movies/components/MovieBrowseCard';
import type {
  ShowcaseItem,
  ShowcaseProvider,
  ShowcaseTheme,
} from '@/features/movies/api/showcaseApi';
import {
  PROVIDER_KEYS,
  PROVIDER_LABEL_KEYS,
  THEME_KEYS,
  THEME_LABEL_KEYS,
  TRENDING_GENRE_IDS,
} from '@/features/movies/showcaseSections';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useWatchlistToggle } from '@/features/watchlist/hooks/useWatchlistToggle';
import ProposeToEventModal from '@/features/events/components/ProposeToEventModal';
import LibraryMovieDetails, {
  useLibraryMovieDetails,
  type LibraryMovieSeed,
} from '@/features/watchlist/components/LibraryMovieDetails';
import HomeHero from './home/HomeHero';
import HomeShowcaseRow from './home/HomeShowcaseRow';
import HomeCollectionsRow from './home/HomeCollectionsRow';
import HomeForYou, { type PersonalRowItem } from './home/HomeForYou';
import HomeMostProposed from './home/HomeMostProposed';
import {
  useFriendsWatchedRow,
  useRecommendationSeed,
  useWatchlistRow,
} from './home/usePersonalRows';
import styles from './HomePage.module.css';

type GenreTabKey = 'all' | `${number}`;

const MOVIE_DETAILS_CHUNKS = [loadMovieDetailsModal];
const FIRST_RAIL_EAGER_COUNT = 3;

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
  useIdlePrefetch(MOVIE_DETAILS_CHUNKS);
  const { locale } = useLocale();
  const { user } = useAuth();
  const [genreTab, setGenreTab] = useState<GenreTabKey>('all');
  const [themeTab, setThemeTab] = useState<ShowcaseTheme>(THEME_KEYS[0]);
  const [providerTab, setProviderTab] = useState<ShowcaseProvider>(PROVIDER_KEYS[0]);
  const details = useLibraryMovieDetails();
  const [proposeTarget, setProposeTarget] = useState<LibraryMovieSeed | null>(null);

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

  const themeTabs = THEME_KEYS.map((key) => ({ key, label: t(THEME_LABEL_KEYS[key]) }));

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
    details.open({
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

  const openDetails = (item: ShowcaseItem) =>
    details.open({
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
      <div className={styles.pair}>
        <HomeShowcaseRow
          headingKey="showcase.sections.nowPlayingTitle"
          seeAllTo={ROUTES.showcaseNowPlaying}
          query={{ section: 'now-playing' }}
          layout="grid"
          library={library}
          onSelect={openDetails}
        />
        <HomeMostProposed onSelect={openDetails} />
      </div>
      <HomeShowcaseRow
        headingKey="showcase.sections.themeTitle"
        seeAllTo={ROUTES.showcaseTheme(themeTab)}
        query={{ section: 'theme', theme: themeTab }}
        library={library}
        onSelect={openDetails}
        tabConfig={{
          ariaLabel: t('showcase.themeLabel'),
          tabs: themeTabs,
          active: themeTab,
          onChange: setThemeTab,
        }}
      />
      <HomeCollectionsRow />

      <LibraryMovieDetails
        target={details.target}
        seed={details.seed}
        watchlist={watchlist}
        onPropose={setProposeTarget}
        onClose={details.close}
      />

      {proposeTarget ? (
        <ProposeToEventModal open movie={proposeTarget} onClose={() => setProposeTarget(null)} />
      ) : null}
    </PageLayout>
  );
}

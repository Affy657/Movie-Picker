import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { buttonClass } from '@/shared/components/Button';
import SearchField from '@/shared/components/SearchField';
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
import HomeShowcaseRow from './home/HomeShowcaseRow';
import HomeCollectionsRow from './home/HomeCollectionsRow';
import HomePersonalRow, { type PersonalRowItem } from './home/HomePersonalRow';
import {
  useFriendsWatchedRow,
  useRecommendationSeed,
  useWatchlistRow,
} from './home/usePersonalRows';
import styles from './HomePage.module.css';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';

type GenreTabKey = 'all' | `${number}`;

const SEARCH_EXAMPLES = ['Dune', 'Bong Joon-ho'];

const MOVIE_DETAILS_CHUNKS = [loadMovieDetailsModal];
const FIRST_RAIL_EAGER_COUNT = 3;

type HomeRail = 'watchlist' | 'recommendations' | 'friends' | 'provider';

function resolveFirstRail(
  personalRowsPending: boolean,
  hasWatchlist: boolean,
  hasRecommendations: boolean,
  hasFriends: boolean
): HomeRail | null {
  if (personalRowsPending) return null;
  if (hasWatchlist) return 'watchlist';
  if (hasRecommendations) return 'recommendations';
  if (hasFriends) return 'friends';
  return 'provider';
}

function eagerCountFor(rail: HomeRail, firstRail: HomeRail | null): number {
  return rail === firstRail ? FIRST_RAIL_EAGER_COUNT : 0;
}

export default function HomePage() {
  const { t } = useTranslation();
  useIdlePrefetch(MOVIE_DETAILS_CHUNKS);
  const { locale } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
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
  const { seedTmdbId, seedTitle, isPending: seedPending } = useRecommendationSeed(isAuthenticated);
  const firstRail = resolveFirstRail(
    watchlistRow.isPending || friendsRow.isPending || seedPending,
    watchlistRow.items.length > 0,
    !!seedTmdbId,
    friendsRow.items.length > 0
  );

  const openPersonalDetails = (item: PersonalRowItem) =>
    details.open({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType ?? 'movie',
      title: item.title,
      year: item.meta,
      posterPath: item.posterPath,
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
    });

  const runSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    void navigate(ROUTES.movieSearchFor(trimmed));
  };

  const submitSearch = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch(searchTerm);
  };

  return (
    <PageLayout className={styles.home}>
      <div className={styles.opener}>
        <h1 className={styles.title}>{t('home.title')}</h1>
        <p className={styles.intro}>{t('home.intro')}</p>
        <form className={styles.searchForm} role="search" onSubmit={submitSearch}>
          <label className="visually-hidden" htmlFor="home-search">
            {t('home.searchLabel')}
          </label>
          <SearchField
            id="home-search"
            className={styles.searchField}
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('home.searchPlaceholder')}
            iconSize={ICON_SIZE.md}
          />
        </form>
        <p className={styles.examples}>
          <span className={styles.examplesLabel}>{t('home.searchExamplesLabel')}</span>
          {SEARCH_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className={styles.example}
              onClick={() => runSearch(example)}
            >
              {example}
            </button>
          ))}
        </p>
      </div>

      {watchlist.error ? (
        <p className="error" role="alert">
          {watchlist.error}
        </p>
      ) : null}

      <HomePersonalRow
        headingKey="showcase.sections.watchlistTitle"
        items={watchlistRow.items}
        isPending={watchlistRow.isPending}
        seeAllTo={ROUTES.watchlist}
        seeAllLabel={t('showcase.seeWatchlist')}
        eagerCount={eagerCountFor('watchlist', firstRail)}
        library={library}
        onSelect={openPersonalDetails}
      />
      {seedTmdbId ? (
        <HomeShowcaseRow
          headingKey="showcase.sections.recommendationsTitle"
          seeAllTo={ROUTES.showcaseRecommendations(seedTmdbId)}
          query={{ section: 'recommendations', seedTmdbId }}
          library={library}
          onSelect={openDetails}
          eagerCount={eagerCountFor('recommendations', firstRail)}
          ratingScale={user?.ratingScale}
          subtitle={seedTitle}
        />
      ) : null}
      <HomePersonalRow
        headingKey="showcase.sections.friendsTitle"
        items={friendsRow.items}
        isPending={friendsRow.isPending}
        eagerCount={eagerCountFor('friends', firstRail)}
        library={library}
        onSelect={openPersonalDetails}
      />
      <HomeShowcaseRow
        headingKey="showcase.sections.providerTitle"
        seeAllTo={ROUTES.showcaseProvider(providerTab)}
        query={{ section: 'provider', provider: providerTab }}
        library={library}
        onSelect={openDetails}
        eagerCount={eagerCountFor('provider', firstRail)}
        ratingScale={user?.ratingScale}
        tabConfig={{
          ariaLabel: t('showcase.providerLabel'),
          tabs: providerTabs,
          active: providerTab,
          onChange: setProviderTab,
        }}
      />
      <HomeShowcaseRow
        headingKey="showcase.sections.trendingTitle"
        seeAllTo={ROUTES.showcaseTrendingForGenre(selectedGenreIds?.[0])}
        query={{ section: 'trending', genreIds: selectedGenreIds }}
        library={library}
        onSelect={openDetails}
        ratingScale={user?.ratingScale}
        tabConfig={{
          ariaLabel: t('showcase.genreLabel'),
          tabs: genreTabs,
          active: genreTab,
          onChange: setGenreTab,
        }}
      />
      <HomeShowcaseRow
        headingKey="showcase.sections.nowPlayingTitle"
        seeAllTo={ROUTES.showcaseNowPlaying}
        query={{ section: 'now-playing' }}
        library={library}
        onSelect={openDetails}
        ratingScale={user?.ratingScale}
      />
      <HomeShowcaseRow
        headingKey="showcase.sections.themeTitle"
        seeAllTo={ROUTES.showcaseTheme(themeTab)}
        query={{ section: 'theme', theme: themeTab }}
        library={library}
        onSelect={openDetails}
        ratingScale={user?.ratingScale}
        tabConfig={{
          ariaLabel: t('showcase.themeLabel'),
          tabs: themeTabs,
          active: themeTab,
          onChange: setThemeTab,
        }}
      />
      <HomeCollectionsRow />
      <HomeShowcaseRow
        headingKey="showcase.sections.mostProposedTitle"
        seeAllTo={ROUTES.showcaseMostProposed}
        query={{ section: 'most-proposed' }}
        showRank
        library={library}
        onSelect={openDetails}
        ratingScale={user?.ratingScale}
      />

      <Card
        as="section"
        padding="none"
        radius="lg"
        className={styles.ctaBand}
        aria-labelledby="home-cta-title"
      >
        <div className={styles.ctaText}>
          <p id="home-cta-title" className={styles.ctaTitle}>
            {t('home.ctaBand.title')}
          </p>
          <p className={styles.ctaBody}>{t('home.ctaBand.body')}</p>
        </div>
        <Link to={ROUTES.createEvent} className={buttonClass({ variant: 'primary' })}>
          {t('home.ctaBand.action')}
        </Link>
      </Card>

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

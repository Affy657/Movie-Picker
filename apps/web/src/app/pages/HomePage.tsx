import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { buttonClass } from '@/shared/components/Button';
import SearchField from '@/shared/components/SearchField';
import { APP_DOCUMENT_TITLE } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useLocale, useTranslation } from '@/shared/i18n';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { ROUTES } from '@/app/routes';
import MovieDetailsModal from '@/features/movies/components/MovieDetailsModal';
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
import type { MovieMediaType } from '@/shared/types/movie';
import HomeShowcaseRow from './home/HomeShowcaseRow';
import HomeCollectionsRow from './home/HomeCollectionsRow';
import HomePersonalRow, { type PersonalRowItem } from './home/HomePersonalRow';
import {
  useFriendsWatchedRow,
  useRecommendationSeed,
  useWatchlistRow,
} from './home/usePersonalRows';
import styles from './HomePage.module.css';

type GenreTabKey = 'all' | `${number}`;

const SEARCH_EXAMPLES = ['Dune', 'Bong Joon-ho'];

interface SelectedMovie {
  tmdbId: number;
  mediaType: MovieMediaType;
  title: string;
  year?: string;
  posterPath: string | null;
}

export default function HomePage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [genreTab, setGenreTab] = useState<GenreTabKey>('all');
  const [themeTab, setThemeTab] = useState<ShowcaseTheme>(THEME_KEYS[0]);
  const [providerTab, setProviderTab] = useState<ShowcaseProvider>(PROVIDER_KEYS[0]);
  const [selected, setSelected] = useState<SelectedMovie | null>(null);

  usePageSeo({
    title: APP_DOCUMENT_TITLE,
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
  const watchlistRow = useWatchlistRow(isAuthenticated);
  const friendsRow = useFriendsWatchedRow(isAuthenticated);
  const { seedTmdbId, seedTitle } = useRecommendationSeed(isAuthenticated);

  const openPersonalDetails = (item: PersonalRowItem) =>
    setSelected({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType ?? 'movie',
      title: item.title,
      year: item.meta,
      posterPath: item.posterPath,
    });

  const selectedGenreIds = genreTab === 'all' ? undefined : [Number(genreTab)];

  const openDetails = (item: ShowcaseItem) =>
    setSelected({
      tmdbId: item.id,
      mediaType: item.mediaType ?? 'movie',
      title: item.title,
      year: item.year,
      posterPath: item.posterPath,
    });

  const runSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    void navigate(ROUTES.movieSearchFor(trimmed));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
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
            iconSize={16}
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

      <HomePersonalRow
        headingKey="showcase.sections.watchlistTitle"
        items={watchlistRow.items}
        isPending={watchlistRow.isPending}
        seeAllTo={ROUTES.watchlist}
        seeAllLabel={t('showcase.seeWatchlist')}
        onSelect={openPersonalDetails}
      />
      {seedTmdbId ? (
        <HomeShowcaseRow
          headingKey="showcase.sections.recommendationsTitle"
          seeAllTo={ROUTES.showcaseRecommendations(seedTmdbId)}
          query={{ section: 'recommendations', seedTmdbId }}
          onSelect={openDetails}
          subtitle={seedTitle}
        />
      ) : null}
      <HomePersonalRow
        headingKey="showcase.sections.friendsTitle"
        items={friendsRow.items}
        isPending={friendsRow.isPending}
        onSelect={openPersonalDetails}
      />
      <HomeShowcaseRow
        headingKey="showcase.sections.providerTitle"
        seeAllTo={ROUTES.showcaseProvider(providerTab)}
        query={{ section: 'provider', provider: providerTab }}
        onSelect={openDetails}
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
        onSelect={openDetails}
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
        onSelect={openDetails}
      />
      <HomeShowcaseRow
        headingKey="showcase.sections.themeTitle"
        seeAllTo={ROUTES.showcaseTheme(themeTab)}
        query={{ section: 'theme', theme: themeTab }}
        onSelect={openDetails}
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
        onSelect={openDetails}
      />

      <section className={styles.ctaBand} aria-labelledby="home-cta-title">
        <div className={styles.ctaText}>
          <p id="home-cta-title" className={styles.ctaTitle}>
            {t('home.ctaBand.title')}
          </p>
          <p className={styles.ctaBody}>{t('home.ctaBand.body')}</p>
        </div>
        <Link to={ROUTES.createEvent} className={buttonClass({ variant: 'primary' })}>
          {t('home.ctaBand.action')}
        </Link>
      </section>

      {selected ? (
        <MovieDetailsModal
          open
          tmdbId={selected.tmdbId}
          mediaType={selected.mediaType}
          title={selected.title}
          year={selected.year}
          posterSrc={posterImageSrc(selected.posterPath)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </PageLayout>
  );
}

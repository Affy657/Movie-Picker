import { useId, useState } from 'react';
import { Tabs, TabPanel } from '@/shared/components/Tabs';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { MovieMediaType } from '@/shared/types/movie';
import { ROUTES } from '@/app/routes';
import MoviePreviewRow, { MoviePreviewRail } from '@/features/movies/components/MoviePreviewRow';
import MovieBrowseCard, {
  type MovieBrowseCardItem,
  type MovieLibraryActions,
} from '@/features/movies/components/MovieBrowseCard';
import { useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import type { ShowcaseItem, ShowcaseQuery } from '@/features/movies/api/showcaseApi';
import { ShowcaseRowBody } from './HomeShowcaseRow';
import styles from './HomeShowcaseRow.module.css';

export interface PersonalRowItem {
  tmdbId: number;
  mediaType?: MovieMediaType;
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  genreIds?: number[];
}

export interface RecommendationSeed {
  tmdbId: number;
  mediaType?: MovieMediaType;
  title?: string;
}

type ForYouTab = 'watchlist' | 'recommendations' | 'friends';

interface Props {
  watchlist: PersonalRowItem[];
  friends: PersonalRowItem[];
  seed: RecommendationSeed | null;
  isPending: boolean;
  eagerCount: number;
  library: MovieLibraryActions;
  onSelectPersonal: (item: PersonalRowItem) => void;
  onSelectShowcase: (item: ShowcaseItem) => void;
}

function toCardItem(item: PersonalRowItem): MovieBrowseCardItem {
  return {
    tmdbId: item.tmdbId,
    mediaType: item.mediaType ?? 'movie',
    title: item.title,
    year: item.year,
    posterPath: item.posterPath,
    voteAverage: item.voteAverage,
    runtimeMinutes: item.runtimeMinutes,
    genreIds: item.genreIds,
  };
}

function PersonalRail({
  items,
  eagerCount,
  library,
  onSelect,
  showListBadge,
}: Readonly<{
  items: PersonalRowItem[];
  eagerCount: number;
  library: MovieLibraryActions;
  onSelect: (item: PersonalRowItem) => void;
  showListBadge: boolean;
}>) {
  return (
    <MoviePreviewRail size="md" itemCount={items.length}>
      {items.map((item, index) => {
        const cardItem = toCardItem(item);
        return (
          <MovieBrowseCard
            key={`${cardItem.tmdbId}|${cardItem.mediaType}`}
            item={cardItem}
            eager={index < eagerCount}
            showListBadge={showListBadge}
            hasHover={library.hasHover}
            isLoggedIn={library.isLoggedIn}
            inWatchlist={library.has(cardItem)}
            onToggleWatchlist={() => library.toggle(cardItem)}
            onProposeToEvent={() => library.propose(cardItem)}
            onOpenDetails={() => onSelect(item)}
          />
        );
      })}
    </MoviePreviewRail>
  );
}

function tabLabel(tab: ForYouTab, t: Translate): string {
  if (tab === 'watchlist') return t('showcase.sections.watchlistTitle');
  if (tab === 'friends') return t('showcase.sections.friendsTitle');
  return t('showcase.sections.recommendedTab');
}

function rowHeader(
  active: ForYouTab,
  seed: RecommendationSeed | null,
  recommendationCount: number,
  t: Translate
): { subtitle?: string; seeAllTo?: string; seeAllLabel?: string } {
  if (active === 'watchlist') {
    return { seeAllTo: ROUTES.watchlist, seeAllLabel: t('showcase.seeWatchlist') };
  }
  if (active !== 'recommendations' || !seed) return {};
  return {
    subtitle: seed.title
      ? t('showcase.sections.becauseYouLiked', { title: seed.title })
      : undefined,
    seeAllTo:
      recommendationCount > 0
        ? ROUTES.showcaseRecommendations(seed.tmdbId, seed.mediaType)
        : undefined,
    seeAllLabel:
      recommendationCount > 0
        ? pluralizeCount(
            recommendationCount,
            'showcase.seeAllMoviesOne',
            'showcase.seeAllMovies',
            t
          )
        : undefined,
  };
}

export default function HomeForYou({
  watchlist,
  friends,
  seed,
  isPending,
  eagerCount,
  library,
  onSelectPersonal,
  onSelectShowcase,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const idBase = useId();
  const [chosen, setChosen] = useState<ForYouTab | null>(null);
  const recommendationsQuery: ShowcaseQuery = {
    section: 'recommendations',
    seedTmdbId: seed?.tmdbId,
    seedMediaType: seed?.mediaType,
  };
  const recommendations = useMovieShowcase(recommendationsQuery, seed != null);
  const recommendationCount = recommendations.data?.items.length ?? 0;
  const hasRecommendations =
    seed != null && !(recommendations.isSuccess && recommendationCount === 0);

  const available: ForYouTab[] = [];
  if (watchlist.length > 0) available.push('watchlist');
  if (hasRecommendations) available.push('recommendations');
  if (friends.length > 0) available.push('friends');

  const [first] = available;
  if (isPending || !first) return null;

  const active = chosen && available.includes(chosen) ? chosen : first;

  const header = rowHeader(active, seed, recommendationCount, t);

  return (
    <MoviePreviewRow
      heading={t('showcase.sections.forYouTitle')}
      subtitle={header.subtitle}
      seeAllTo={header.seeAllTo}
      seeAllLabel={header.seeAllLabel}
      toolbar={
        <Tabs<ForYouTab>
          idBase={idBase}
          tabs={available.map((key) => ({ key, label: tabLabel(key, t) }))}
          active={active}
          onChange={setChosen}
          ariaLabel={t('showcase.forYouLabel')}
          variant="chip"
          className={styles.tabs}
        />
      }
    >
      <TabPanel idBase={idBase} tabKey={active} active className={styles.panel}>
        {active === 'recommendations' ? (
          <ShowcaseRowBody
            query={recommendationsQuery}
            eagerCount={eagerCount}
            library={library}
            onSelect={onSelectShowcase}
          />
        ) : (
          <PersonalRail
            items={active === 'watchlist' ? watchlist : friends}
            showListBadge={active !== 'watchlist'}
            eagerCount={eagerCount}
            library={library}
            onSelect={onSelectPersonal}
          />
        )}
      </TabPanel>
    </MoviePreviewRow>
  );
}

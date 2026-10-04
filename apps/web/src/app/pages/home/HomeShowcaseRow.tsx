import { useId } from 'react';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { Tabs, TabPanel, type TabDef } from '@/shared/components/Tabs';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { RatingScale } from '@/shared/types/theme';
import MoviePreviewRow, { MoviePreviewRail } from '@/features/movies/components/MoviePreviewRow';
import { MovieRankBadge } from '@/features/movies/components/ShowcaseMovieCard';
import MovieBrowseCard, {
  type MovieBrowseCardItem,
  type MovieLibraryActions,
} from '@/features/movies/components/MovieBrowseCard';
import { useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import type { ShowcaseItem, ShowcaseQuery } from '@/features/movies/api/showcaseApi';
import styles from './HomeShowcaseRow.module.css';
import EmptyState from '@/shared/components/EmptyState';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { Film } from 'lucide-react';
import InlineError from '@/shared/components/InlineError';

const SKELETON_CARDS = 6;
export const RAIL_PREVIEW_COUNT = 20;

interface TabConfig<T extends string> {
  ariaLabel: string;
  tabs: ReadonlyArray<TabDef<T>>;
  active: T;
  onChange: (key: T) => void;
}

interface Props<T extends string> {
  headingKey: TranslationKey;
  subtitle?: string;
  seeAllTo: string;
  query: ShowcaseQuery;
  showRank?: boolean;
  eagerCount?: number;
  ratingScale?: RatingScale;
  library: MovieLibraryActions;
  onSelect: (item: ShowcaseItem) => void;
  tabConfig?: TabConfig<T>;
}

function toCardItem(item: ShowcaseItem): MovieBrowseCardItem {
  return {
    tmdbId: item.id,
    mediaType: item.mediaType ?? 'movie',
    title: item.title,
    year: item.year,
    posterPath: item.posterPath,
    voteAverage: item.voteAverage,
    runtimeMinutes: item.runtimeMinutes,
    genreIds: item.genreIds,
  };
}

function SkeletonRow({ label }: Readonly<{ label: string }>) {
  return (
    <SkeletonScreen label={label}>
      <ul className={styles.skeletonGrid}>
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <li key={index} className={styles.skeletonCard}>
            <Skeleton variant="poster" />
            <div className={styles.skeletonBody}>
              <Skeleton
                variant="text"
                width="80%"
                height="calc(2 * var(--leading-snug) * var(--font-size-sm))"
              />
              <Skeleton variant="text" width="40%" height="var(--space-4)" />
            </div>
          </li>
        ))}
      </ul>
    </SkeletonScreen>
  );
}

export default function HomeShowcaseRow<T extends string>({
  headingKey,
  subtitle,
  seeAllTo,
  query,
  showRank = false,
  eagerCount = 0,
  ratingScale,
  library,
  onSelect,
  tabConfig,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const panelIdBase = useId();
  const showcase = useMovieShowcase(query);
  const items = showcase.data?.items ?? [];
  const previewItems = items.slice(0, RAIL_PREVIEW_COUNT);

  const seeAllLabel = pluralizeCount(
    items.length,
    'showcase.seeAllMoviesOne',
    'showcase.seeAllMovies',
    t
  );

  const grid = (
    <MoviePreviewRail size="md" itemCount={previewItems.length}>
      {previewItems.map((item, index) => {
        const cardItem = toCardItem(item);
        return (
          <MovieBrowseCard
            key={`${cardItem.tmdbId}|${cardItem.mediaType}`}
            item={cardItem}
            ratingScale={ratingScale}
            meta={
              showRank && item.eventCount != null
                ? pluralizeCount(
                    item.eventCount,
                    'showcase.eventCountOne',
                    'showcase.eventCount',
                    t
                  )
                : undefined
            }
            eager={index < eagerCount}
            hasHover={library.hasHover}
            isLoggedIn={library.isLoggedIn}
            inWatchlist={library.has(cardItem)}
            onToggleWatchlist={() => library.toggle(cardItem)}
            onProposeToEvent={() => library.propose(cardItem)}
            onOpenDetails={() => onSelect(item)}
            leadingBadge={
              showRank && item.rank != null ? (
                <MovieRankBadge
                  rank={item.rank}
                  label={t('showcase.rank', { rank: item.rank })}
                  stacked
                />
              ) : undefined
            }
          />
        );
      })}
    </MoviePreviewRail>
  );

  let body;
  if (showcase.isPending) {
    body = <SkeletonRow label={t('showcase.loading')} />;
  } else if (showcase.isError) {
    body = (
      <InlineError
        message={t('showcase.error')}
        retryLabel={t('showcase.retry')}
        onRetry={() => void showcase.refetch()}
        messageRole="status"
      />
    );
  } else if (items.length === 0 && !tabConfig) {
    return null;
  } else if (items.length === 0) {
    body = (
      <EmptyState
        compact
        icon={<Film aria-hidden size={ICON_SIZE['2xl']} />}
        title={t('showcase.empty')}
        message={t('showcase.emptyMessage')}
      />
    );
  } else {
    body = grid;
  }

  if (tabConfig) {
    body = (
      <TabPanel idBase={panelIdBase} tabKey={tabConfig.active} active className={styles.panel}>
        {body}
      </TabPanel>
    );
  }

  return (
    <MoviePreviewRow
      heading={t(headingKey)}
      subtitle={subtitle}
      seeAllTo={items.length > 0 ? seeAllTo : undefined}
      seeAllLabel={items.length > 0 ? seeAllLabel : undefined}
      toolbar={
        tabConfig ? (
          <Tabs
            idBase={panelIdBase}
            tabs={tabConfig.tabs}
            active={tabConfig.active}
            onChange={tabConfig.onChange}
            ariaLabel={tabConfig.ariaLabel}
            variant="pill"
            className={styles.tabs}
          />
        ) : undefined
      }
    >
      {body}
    </MoviePreviewRow>
  );
}

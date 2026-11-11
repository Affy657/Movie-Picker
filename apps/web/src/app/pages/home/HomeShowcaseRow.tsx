import { useId, type ReactNode } from 'react';
import clsx from 'clsx';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { Tabs, TabPanel, type TabDef } from '@/shared/components/Tabs';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import MoviePreviewRow, { MoviePreviewRail } from '@/features/movies/components/MoviePreviewRow';
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
const TOP_COUNT = 10;
const GRID_COUNT = 8;

export type ShowcaseRowLayout = 'rail' | 'ranked' | 'grid';

const LAYOUT_LIMIT: Record<ShowcaseRowLayout, number> = {
  rail: RAIL_PREVIEW_COUNT,
  ranked: TOP_COUNT,
  grid: GRID_COUNT,
};

interface TabConfig<T extends string> {
  ariaLabel: string;
  tabs: ReadonlyArray<TabDef<T>>;
  active: T;
  onChange: (key: T) => void;
}

interface BodyProps {
  query: ShowcaseQuery;
  layout?: ShowcaseRowLayout;
  eagerCount?: number;
  library: MovieLibraryActions;
  onSelect: (item: ShowcaseItem) => void;
  emptyState?: boolean;
}

interface Props<T extends string> extends BodyProps {
  headingKey: TranslationKey;
  subtitle?: string;
  seeAllTo: string;
  tabConfig?: TabConfig<T>;
  className?: string;
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
          </li>
        ))}
      </ul>
    </SkeletonScreen>
  );
}

function ShowcaseCards({
  items,
  layout,
  eagerCount,
  library,
  onSelect,
}: Readonly<{
  items: ShowcaseItem[];
  layout: ShowcaseRowLayout;
  eagerCount: number;
  library: MovieLibraryActions;
  onSelect: (item: ShowcaseItem) => void;
}>) {
  const cards = items.map((item, index) => {
    const cardItem = toCardItem(item);
    return (
      <MovieBrowseCard
        key={`${cardItem.tmdbId}|${cardItem.mediaType}`}
        item={cardItem}
        rank={layout === 'ranked' ? index + 1 : undefined}
        eager={index < eagerCount}
        hasHover={library.hasHover}
        isLoggedIn={library.isLoggedIn}
        inWatchlist={library.has(cardItem)}
        onToggleWatchlist={() => library.toggle(cardItem)}
        onProposeToEvent={() => library.propose(cardItem)}
        onOpenDetails={() => onSelect(item)}
      />
    );
  });

  if (layout === 'grid') return <ul className={styles.posterGrid}>{cards}</ul>;
  return (
    <MoviePreviewRail size={layout === 'ranked' ? 'ranked' : 'md'} itemCount={items.length}>
      {cards}
    </MoviePreviewRail>
  );
}

export function ShowcaseRowBody({
  query,
  layout = 'rail',
  eagerCount = 0,
  library,
  onSelect,
  emptyState = false,
}: Readonly<BodyProps>): ReactNode {
  const { t } = useTranslation();
  const showcase = useMovieShowcase(query);
  const items = (showcase.data?.items ?? []).slice(0, LAYOUT_LIMIT[layout]);

  if (showcase.isPending) return <SkeletonRow label={t('showcase.loading')} />;
  if (showcase.isError) {
    return (
      <InlineError
        message={t('showcase.error')}
        retryLabel={t('showcase.retry')}
        onRetry={() => void showcase.refetch()}
        messageRole="status"
      />
    );
  }
  if (items.length === 0) {
    return emptyState ? (
      <EmptyState
        compact
        icon={<Film aria-hidden size={ICON_SIZE['2xl']} />}
        title={t('showcase.empty')}
        message={t('showcase.emptyMessage')}
      />
    ) : null;
  }
  return (
    <ShowcaseCards
      items={items}
      layout={layout}
      eagerCount={eagerCount}
      library={library}
      onSelect={onSelect}
    />
  );
}

export default function HomeShowcaseRow<T extends string>({
  headingKey,
  subtitle,
  seeAllTo,
  query,
  layout = 'rail',
  eagerCount = 0,
  library,
  onSelect,
  tabConfig,
  className,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const panelIdBase = useId();
  const showcase = useMovieShowcase(query);
  const total = showcase.data?.items.length ?? 0;
  const settledEmpty = !showcase.isPending && !showcase.isError && total === 0;

  if (settledEmpty && !tabConfig) return null;

  const seeAllLabel = pluralizeCount(total, 'showcase.seeAllMoviesOne', 'showcase.seeAllMovies', t);

  let body = (
    <ShowcaseRowBody
      query={query}
      layout={layout}
      eagerCount={eagerCount}
      library={library}
      onSelect={onSelect}
      emptyState={!!tabConfig}
    />
  );

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
      seeAllTo={total > 0 ? seeAllTo : undefined}
      seeAllLabel={total > 0 ? seeAllLabel : undefined}
      className={clsx(layout === 'grid' && styles.gridRow, className)}
      toolbar={
        tabConfig ? (
          <Tabs
            idBase={panelIdBase}
            tabs={tabConfig.tabs}
            active={tabConfig.active}
            onChange={tabConfig.onChange}
            ariaLabel={tabConfig.ariaLabel}
            variant="chip"
            className={styles.tabs}
          />
        ) : undefined
      }
    >
      {body}
    </MoviePreviewRow>
  );
}

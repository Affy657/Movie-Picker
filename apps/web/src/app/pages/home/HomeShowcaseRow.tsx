import { useId } from 'react';
import Button from '@/shared/components/Button';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { Tabs, TabPanel, type TabDef } from '@/shared/components/Tabs';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import MoviePreviewRow, { MoviePreviewRail } from '@/features/movies/components/MoviePreviewRow';
import MoviePosterCard from '@/features/movies/components/MoviePosterCard';
import { useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import type { ShowcaseItem, ShowcaseQuery } from '@/features/movies/api/showcaseApi';
import styles from './HomeShowcaseRow.module.css';

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
  onSelect?: (item: ShowcaseItem) => void;
  tabConfig?: TabConfig<T>;
}

function SkeletonRow({ label }: Readonly<{ label: string }>) {
  return (
    <SkeletonScreen label={label}>
      <ul className={styles.skeletonGrid}>
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <li key={index} className={styles.skeletonCard}>
            <Skeleton variant="poster" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="40%" />
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
      {previewItems.map((item) => (
        <MoviePosterCard
          key={`${item.id}|${item.mediaType ?? 'movie'}`}
          title={item.title}
          meta={
            showRank && item.eventCount != null
              ? pluralizeCount(item.eventCount, 'showcase.eventCountOne', 'showcase.eventCount', t)
              : item.year
          }
          posterSrc={tmdbPosterSrcForListDisplay(posterImageSrc(item.posterPath))}
          rank={showRank && item.rank != null ? item.rank : undefined}
          rankLabel={
            showRank && item.rank != null ? t('showcase.rank', { rank: item.rank }) : undefined
          }
          onSelect={onSelect ? () => onSelect(item) : undefined}
          selectLabel={item.title}
        />
      ))}
    </MoviePreviewRail>
  );

  let body;
  if (showcase.isPending) {
    body = <SkeletonRow label={t('showcase.loading')} />;
  } else if (showcase.isError) {
    body = (
      <p className={styles.state}>
        {t('showcase.error')}
        <Button size="sm" variant="secondary" onClick={() => void showcase.refetch()}>
          {t('showcase.retry')}
        </Button>
      </p>
    );
  } else if (items.length === 0 && !tabConfig) {
    return null;
  } else if (items.length === 0) {
    body = <p className={styles.state}>{t('showcase.empty')}</p>;
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

import { Film } from 'lucide-react';
import InlineError from '@/shared/components/InlineError';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useLocale, useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { ROUTES } from '@/app/routes';
import MoviePreviewRow from '@/features/movies/components/MoviePreviewRow';
import { useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import type { ShowcaseItem } from '@/features/movies/api/showcaseApi';
import styles from './HomeMostProposed.module.css';

const LIST_COUNT = 6;
const SKELETON_ROWS = 4;

function factsLine(item: ShowcaseItem, tmdbLanguage: string): string {
  const genre = item.genreIds?.[0];
  const parts = [item.year, genre != null ? genreLabel(genre, tmdbLanguage) : null];
  return parts.filter(Boolean).join(', ');
}

export default function HomeMostProposed({
  onSelect,
  className,
}: Readonly<{ onSelect: (item: ShowcaseItem) => void; className?: string }>) {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const showcase = useMovieShowcase({ section: 'most-proposed' });
  const all = showcase.data?.items ?? [];
  const items = all.slice(0, LIST_COUNT);

  if (!showcase.isPending && !showcase.isError && all.length === 0) return null;

  let body;
  if (showcase.isPending) {
    body = (
      <SkeletonScreen label={t('showcase.loading')}>
        <div className={styles.skeleton}>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton key={index} variant="block" height="var(--space-16)" />
          ))}
        </div>
      </SkeletonScreen>
    );
  } else if (showcase.isError) {
    body = (
      <InlineError
        message={t('showcase.error')}
        retryLabel={t('showcase.retry')}
        onRetry={() => void showcase.refetch()}
        messageRole="status"
      />
    );
  } else {
    body = (
      <ol className={styles.list}>
        {items.map((item, index) => {
          const src = tmdbPosterSrcForListDisplay(posterImageSrc(item.posterPath));
          return (
            <li key={`${item.id}|${item.mediaType ?? 'movie'}`} className={styles.row}>
              <button
                type="button"
                className={styles.trigger}
                onClick={() => onSelect(item)}
                aria-label={t('movies.card.openDetailsAria', { title: item.title })}
              />
              <span className={styles.rank} aria-hidden>
                {item.rank ?? index + 1}
              </span>
              <span className={styles.poster}>
                {src ? (
                  <img src={src} alt="" loading="lazy" decoding="async" />
                ) : (
                  <Film size={ICON_SIZE.md} aria-hidden />
                )}
              </span>
              <span className={styles.text}>
                <span className={styles.title}>{item.title}</span>
                <span className={styles.facts}>{factsLine(item, tmdbLanguage)}</span>
              </span>
              {item.eventCount != null ? (
                <span className={styles.count}>
                  {pluralizeCount(
                    item.eventCount,
                    'showcase.eventCountOne',
                    'showcase.eventCount',
                    t
                  )}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <MoviePreviewRow
      heading={t('showcase.sections.mostProposedTitle')}
      seeAllTo={all.length > 0 ? ROUTES.showcaseMostProposed : undefined}
      seeAllLabel={
        all.length > 0
          ? pluralizeCount(all.length, 'showcase.seeAllMoviesOne', 'showcase.seeAllMovies', t)
          : undefined
      }
      className={className}
    >
      {body}
    </MoviePreviewRow>
  );
}

import type { ReactNode } from 'react';
import { Film } from 'lucide-react';
import type { MovieSearchItem } from '@/features/movies/api/moviesApi';
import { useTranslation } from '@/shared/i18n';
import type { RatingScale } from '@/shared/types/theme';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { safeTmdbWatchUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import Chip from '@/shared/components/Chip';
import { ICON_SIZE } from '@/shared/components/iconSize';
import MovieFacts from '@/features/movies/components/MovieFacts';
import StreamingStatus from '@/features/movies/components/StreamingStatus';
import styles from './MovieSearchRow.module.css';

type Props = {
  item: MovieSearchItem;
  action: ReactNode;
  status?: ReactNode;
  showAvailability?: boolean;
  ratingScale?: RatingScale;
  onOpen?: (trigger: HTMLElement) => void;
};

export default function MovieSearchRow({
  item,
  action,
  status,
  showAvailability = true,
  ratingScale,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const rawPoster = posterImageSrc(item.posterPath);
  const poster = rawPoster ? tmdbPosterSrcForListDisplay(rawPoster) : undefined;
  const title = (
    <>
      <span className={styles.titleText}>{item.title}</span>
      {item.mediaType === 'tv' ? (
        <Chip tone="primary" size="sm" className={styles.tvBadge}>
          {t('movies.list.tvBadge')}
        </Chip>
      ) : null}
    </>
  );

  return (
    <li className={styles.row}>
      <div className={styles.poster}>
        {poster ? (
          <img src={poster} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className={styles.posterPlaceholder} aria-hidden>
            <Film size={ICON_SIZE.xl} />
          </div>
        )}
      </div>
      <div className={styles.body}>
        {onOpen ? (
          <button
            type="button"
            className={styles.titleButton}
            onClick={(e) => onOpen(e.currentTarget)}
            aria-label={t('movies.search.openDetailsAria', { title: item.title })}
          >
            {title}
          </button>
        ) : (
          <span className={styles.title}>{title}</span>
        )}
        <MovieFacts movie={item} scale={ratingScale} className={styles.facts} />
        {status}
        {showAvailability ? (
          <StreamingStatus
            providers={item.watchProviders}
            watchPageUrl={safeTmdbWatchUrl(item.tmdbWatchPageUrl)}
          />
        ) : null}
      </div>
      <div className={styles.action}>{action}</div>
    </li>
  );
}

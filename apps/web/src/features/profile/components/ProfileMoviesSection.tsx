import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Film } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { fetchUserWatchedMovies } from '@/features/profile/api/profileApi';
import styles from './ProfileMoviesSection.module.css';

const PREVIEW_TAKE = 6;

interface Props {
  handle: string;
}

export default function ProfileMoviesSection({ handle }: Readonly<Props>) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: queryKeys.profile.watchedMovies(handle, PREVIEW_TAKE),
    queryFn: ({ signal }) => fetchUserWatchedMovies(handle, PREVIEW_TAKE, signal),
  });

  const items = query.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="profile-movies-heading">
      <div className={styles.headerRow}>
        <h2 id="profile-movies-heading" className={styles.heading}>
          {t('profile.movies.title')}
        </h2>
        <Link to={ROUTES.profileMovies(handle)} className={styles.seeAllLink}>
          {t('profile.movies.seeAll')}
        </Link>
      </div>
      <ul className={styles.grid}>
        {items.map((item) => {
          const posterRaw = posterImageSrc(item.posterPath);
          const posterSrc = posterRaw ? tmdbPosterSrcForListDisplay(posterRaw) : undefined;
          return (
            <li key={`${item.tmdbId}|${item.mediaType}|${item.watchedAt}`} className={styles.card}>
              <span className={styles.posterWrap}>
                {posterSrc ? (
                  <img
                    src={posterSrc}
                    alt=""
                    className={styles.poster}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className={styles.posterPlaceholder} aria-hidden>
                    <Film size={22} />
                  </span>
                )}
              </span>
              <span className={styles.cardTitle}>{item.title}</span>
              <span className={styles.cardYear}>{item.year}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

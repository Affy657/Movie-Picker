import { useEffect, useState } from 'react';
import { useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { posterImageSrc, posterSrcAtSize } from '@/shared/utils/posterUrl';
import styles from './HomePosterWall.module.css';

const WALL_TILES = 40;
const WALL_TILES_MOBILE = 18;
const WALL_POSTER_SIZE = 'w154';
const IDLE_FALLBACK_MS = 200;

function useAfterIdle(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const show = () => setReady(true);
    if (typeof requestIdleCallback === 'function' && typeof cancelIdleCallback === 'function') {
      const cancel = cancelIdleCallback;
      const handle = requestIdleCallback(show);
      return () => cancel(handle);
    }
    const timer = setTimeout(show, IDLE_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);
  return ready;
}

export default function HomePosterWall() {
  const ready = useAfterIdle();
  const isMobile = useIsMobile();
  const trending = useMovieShowcase({ section: 'trending' });
  const posters = (trending.data?.items ?? [])
    .map((item) => posterSrcAtSize(posterImageSrc(item.posterPath), WALL_POSTER_SIZE))
    .filter((src): src is string => src != null);
  const count = isMobile ? WALL_TILES_MOBILE : WALL_TILES;

  return (
    <div className={styles.wall} aria-hidden="true">
      {ready && posters.length > 0 ? (
        <div className={styles.track}>
          {Array.from({ length: count }, (_, index) => (
            <img
              key={index}
              src={posters[index % posters.length]}
              alt=""
              className={styles.tile}
              decoding="async"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

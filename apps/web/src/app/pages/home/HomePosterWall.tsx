import { useMovieShowcase } from '@/features/movies/hooks/useMovieShowcase';
import { useAfterIdle } from '@/shared/hooks/useAfterIdle';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { posterImageSrc, posterSrcAtSize } from '@/shared/utils/posterUrl';
import styles from './HomePosterWall.module.css';

const WALL_TILES = 160;
const WALL_TILES_MOBILE = 42;
const WALL_POSTER_SIZE = 'w154';
const WALL_DISTINCT_POSTERS = 24;

export default function HomePosterWall() {
  const ready = useAfterIdle();
  const isMobile = useIsMobile();
  const trending = useMovieShowcase({ section: 'trending' });
  const posters = (trending.data?.items ?? [])
    .map((item) => posterSrcAtSize(posterImageSrc(item.posterPath), WALL_POSTER_SIZE))
    .filter((src): src is string => src != null)
    .slice(0, WALL_DISTINCT_POSTERS);
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

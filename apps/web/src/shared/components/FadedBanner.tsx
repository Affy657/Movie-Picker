import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { Film } from 'lucide-react';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { posterImageSrc, posterSrcAtSize } from '@/shared/utils/posterUrl';
import styles from './FadedBanner.module.css';

export interface FadedBannerCredit {
  title: string;
  to: string;
  ariaLabel: string;
}

type Props = {
  imageUrl: string;
  fromTmdb?: boolean;
  credit?: FadedBannerCredit | null;
  action?: ReactNode;
  tinted?: boolean;
};

function tmdbSourceSet(imageUrl: string): string | undefined {
  const small = posterSrcAtSize(imageUrl, 'w780');
  const large = posterSrcAtSize(imageUrl, 'w1280');
  return small && large ? `${small} 780w, ${large} 1280w` : undefined;
}

export default function FadedBanner({
  imageUrl,
  fromTmdb = false,
  credit = null,
  action,
  tinted = false,
}: Readonly<Props>) {
  const [loaded, setLoaded] = useState(false);
  const src = fromTmdb ? (posterSrcAtSize(imageUrl, 'w1280') ?? imageUrl) : imageUrl;

  return (
    <div className={clsx(styles.banner, tinted && styles.tinted)}>
      <div className={styles.backdrop} aria-hidden="true">
        <img
          src={posterImageSrc(src)}
          srcSet={fromTmdb ? tmdbSourceSet(imageUrl) : undefined}
          sizes="100vw"
          alt=""
          decoding="async"
          data-testid="faded-banner-image"
          className={clsx(styles.image, loaded && styles.imageLoaded)}
          onLoad={() => setLoaded(true)}
        />
      </div>
      {credit || action ? (
        <div className={styles.tools}>
          {credit ? (
            <Link to={credit.to} className={styles.credit} aria-label={credit.ariaLabel}>
              <Film size={ICON_SIZE.sm} aria-hidden />
              <span className={styles.creditTitle}>{credit.title}</span>
            </Link>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}

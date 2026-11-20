import { useState } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { Film, Pencil } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { posterImageSrc, posterSrcAtSize } from '@/shared/utils/posterUrl';
import type { ProfileBanner as Banner } from '@/features/profile/api/profileApi';
import styles from './ProfileBanner.module.css';

type Props = {
  banner: Banner;
  isOwner: boolean;
  onEdit: () => void;
};

function sourceSet(banner: Banner): string | undefined {
  if (banner.source !== 'film') return undefined;
  const small = posterSrcAtSize(banner.imageUrl, 'w780');
  return small ? `${small} 780w, ${banner.imageUrl} 1280w` : undefined;
}

export default function ProfileBanner({ banner, isOwner, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const title = banner.source === 'film' ? banner.title : null;

  return (
    <div className={styles.banner}>
      <div className={styles.backdrop} aria-hidden="true">
        <img
          src={posterImageSrc(banner.imageUrl)}
          srcSet={sourceSet(banner)}
          sizes="100vw"
          alt=""
          decoding="async"
          data-testid="profile-banner-image"
          className={clsx(styles.image, loaded && styles.imageLoaded)}
          onLoad={() => setLoaded(true)}
        />
      </div>
      {(title || isOwner) && (
        <div className={styles.tools}>
          {title && banner.tmdbId && (
            <Link
              to={ROUTES.moviePage({ tmdbId: banner.tmdbId, title })}
              className={styles.credit}
              aria-label={t('profile.banner.creditAriaLabel', { title })}
            >
              <Film size={ICON_SIZE.sm} aria-hidden />
              <span className={styles.creditTitle}>{title}</span>
            </Link>
          )}
          {isOwner && (
            <IconButton
              ariaLabel={t('profile.banner.edit')}
              tone="onPoster"
              shape="round"
              expandHitArea
              onClick={onEdit}
            >
              <Pencil size={ICON_SIZE.md} aria-hidden />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

import clsx from 'clsx';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { RatingScale } from '@/shared/types/theme';
import MoviePreviewRow from '@/features/movies/components/MoviePreviewRow';
import MovieBrowseCard, {
  type MovieLibraryActions,
} from '@/features/movies/components/MovieBrowseCard';
import PosterFan from '@/features/events/components/PosterFan';
import {
  WATCHLIST_PREVIEW_TAKE,
  fetchUserWatchlistPreview,
  type UserWatchlistItem,
} from '@/features/profile/api/profileApi';
import styles from './ProfileWatchlistPreview.module.css';

interface Props {
  handle: string;
  count: number;
  isHidden: boolean;
  isOwnProfile: boolean;
  isMobile: boolean;
  wide: boolean;
  library: MovieLibraryActions;
  ratingScale?: RatingScale;
  onOpenDetails: (item: UserWatchlistItem) => void;
}

function HiddenNotice({ className }: Readonly<{ className?: string }>) {
  const { t } = useTranslation();
  return (
    <div className={clsx(styles.hidden, className)}>
      <Chip tone="warning" size="sm">
        {t('profile.watchlist.hidden')}
      </Chip>
      <Link
        to={ROUTES.accountProfile}
        className={buttonClass({ variant: 'ghost', size: 'sm', className: styles.makeVisible })}
      >
        {t('profile.watchlist.makeVisible')}
      </Link>
    </div>
  );
}

export default function ProfileWatchlistPreview({
  handle,
  count,
  isHidden,
  isOwnProfile,
  isMobile,
  wide,
  library,
  ratingScale,
  onOpenDetails,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: queryKeys.profile.watchlist(handle, WATCHLIST_PREVIEW_TAKE),
    queryFn: ({ signal }) => fetchUserWatchlistPreview(handle, signal),
    enabled: count > 0,
  });

  const items = query.data ?? [];
  const to = isOwnProfile ? ROUTES.watchlist : ROUTES.profileWatchlist(handle);
  const heading = isOwnProfile ? t('profile.watchlist.mine') : t('profile.watchlist.theirs');
  const countLabel =
    count === 0
      ? t('profile.watchlist.empty')
      : pluralizeCount(count, 'profile.watchlist.countOne', 'profile.watchlist.count', t);

  if (isMobile) {
    return (
      <div className={styles.mobile}>
        <Card as={Link} to={to} interactive padding="none" radius="lg" className={styles.row}>
          <PosterFan posters={items} className={styles.fan} />
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>{heading}</span>
            <span className={styles.rowCount}>{countLabel}</span>
          </span>
          <ChevronRight size={ICON_SIZE.md} className={styles.chevron} aria-hidden />
        </Card>
        {isHidden && <HiddenNotice />}
      </div>
    );
  }

  return (
    <MoviePreviewRow
      heading={heading}
      headingCount={count > 0 ? count : undefined}
      seeAllTo={to}
      seeAllLabel={t('profile.watchlist.seeAll')}
      toolbar={isHidden ? <HiddenNotice className={styles.toolbar} /> : undefined}
    >
      {count === 0 ? (
        <p className={styles.empty}>{countLabel}</p>
      ) : (
        <ul className={clsx(styles.grid, wide && styles.gridWide)}>
          {items.map((item) => (
            <MovieBrowseCard
              key={`${item.mediaType}|${item.tmdbId}`}
              item={item}
              ratingScale={ratingScale}
              hasHover={library.hasHover}
              isLoggedIn={library.isLoggedIn}
              inWatchlist={library.has(item)}
              onToggleWatchlist={() => library.toggle(item)}
              onProposeToEvent={() => library.propose(item)}
              onOpenDetails={() => onOpenDetails(item)}
            />
          ))}
        </ul>
      )}
    </MoviePreviewRow>
  );
}

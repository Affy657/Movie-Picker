import { Link } from 'react-router';
import { Lock, Plus } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import MoviePreviewRow from '@/features/movies/components/MoviePreviewRow';
import MovieBrowseCard, {
  type MovieLibraryActions,
} from '@/features/movies/components/MovieBrowseCard';
import { FAVORITES_MAX } from '@/features/profile/api/profileApi';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { FavoriteTitle } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import styles from './ProfileFavoritesSection.module.css';

interface Props {
  favorites: readonly FavoriteTitle[];
  isOwnProfile: boolean;
  library: MovieLibraryActions;
  ratingScale?: RatingScale;
  onOpenDetails: (favorite: FavoriteTitle) => void;
}

function FavoritesInvite() {
  const { t } = useTranslation();

  return (
    <Card padding="lg" radius="lg">
      <MoviePreviewRow
        heading={t('profile.favorites.ownerTitle')}
        toolbar={
          <Chip size="sm" tone="muted" icon={Lock} className={styles.ownerOnly}>
            {t('profile.favorites.ownerOnly')}
          </Chip>
        }
      >
        <div className={styles.invite}>
          <div className={styles.inviteSlots} aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.inviteBody}>
            <p className={styles.inviteText}>{t('profile.favorites.inviteText')}</p>
            <Link
              to={ROUTES.accountFavorites}
              className={buttonClass({
                variant: 'primary',
                size: 'sm',
                className: styles.inviteCta,
              })}
            >
              <Plus size={ICON_SIZE.md} aria-hidden />
              <span>{t('profile.favorites.inviteCta')}</span>
            </Link>
          </div>
        </div>
      </MoviePreviewRow>
    </Card>
  );
}

export default function ProfileFavoritesSection({
  favorites,
  isOwnProfile,
  library,
  ratingScale,
  onOpenDetails,
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (favorites.length === 0) return isOwnProfile ? <FavoritesInvite /> : null;

  const freePlaces = isOwnProfile ? Math.max(0, FAVORITES_MAX - favorites.length) : 0;

  return (
    <Card padding="lg" radius="lg">
      <MoviePreviewRow
        heading={t(
          isOwnProfile ? 'profile.favorites.ownerTitle' : 'profile.favorites.visitorTitle'
        )}
        seeAllTo={isOwnProfile ? ROUTES.accountFavorites : undefined}
        seeAllLabel={t('profile.favorites.edit')}
      >
        <ul className={styles.grid}>
          {favorites.map((item) => (
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
          {Array.from({ length: freePlaces }, (_, index) => (
            <li key={`free-${index}`} className={styles.freePlace}>
              <Link
                to={ROUTES.accountFavorites}
                className={styles.freePlaceLink}
                aria-label={t('profile.favorites.addSlotAria')}
              >
                <span className={styles.freePlaceIcon} aria-hidden>
                  <Plus size={ICON_SIZE.lg} />
                </span>
                <span aria-hidden>{t('profile.favorites.addSlot')}</span>
              </Link>
            </li>
          ))}
        </ul>
      </MoviePreviewRow>
    </Card>
  );
}

import { Trophy } from 'lucide-react';
import clsx from 'clsx';
import MovieListCard from '@/features/movies/components/MovieListCard';
import cardStyles from '@/features/movies/components/MovieListCard.module.css';
import { useTranslation } from '@/shared/i18n';
import type { UserMovieItem } from '@/features/profile/api/profileApi';
import styles from './ProfileMovieCard.module.css';

interface ProfileMovieCardProps {
  item: UserMovieItem;
  tmdbLanguage: string;
  onOpenDetails: () => void;
}

export default function ProfileMovieCard({
  item,
  tmdbLanguage,
  onOpenDetails,
}: Readonly<ProfileMovieCardProps>) {
  const { t } = useTranslation();
  const isTv = item.mediaType === 'tv';

  return (
    <MovieListCard
      title={item.title}
      year={item.year}
      posterPath={item.posterPath}
      tmdbLanguage={tmdbLanguage}
      genreIds={item.genreIds}
      onOpenDetails={onOpenDetails}
      openDetailsAriaLabel={t('profile.movies.card.openDetailsAria', { title: item.title })}
      badges={
        (isTv || item.isWinner) && (
          <div className={styles.badgeGroup}>
            {isTv && (
              <span className={clsx(cardStyles.badge, cardStyles.badgeStacked)}>
                {t('movies.list.tvBadge')}
              </span>
            )}
            {item.isWinner && (
              <span className={clsx(cardStyles.badge, cardStyles.badgeStacked, styles.winnerBadge)}>
                <Trophy size={11} aria-hidden />
                <span className={styles.winnerBadgeLabel}>
                  {t('profile.movies.winnerBadgeShort')}
                </span>
              </span>
            )}
          </div>
        )
      }
    />
  );
}

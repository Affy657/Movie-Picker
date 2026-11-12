import { Link } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { TranslationKey } from '@/shared/i18n/t';
import { Skeleton } from '@/shared/components/Skeleton';
import type { RatingScale } from '@/shared/types/theme';
import { formatRating } from '@/shared/utils/formatRating';
import type { UserStats } from '@/features/events/api/userStatsApi';
import styles from './ProfileStatsSection.module.css';

interface Figure {
  key: string;
  value: number;
  label: string;
  display?: string;
  to?: string;
}

interface Props {
  stats: UserStats;
  watchedCount?: number;
  watchedPending?: boolean;
  watchedTo: string;
  proposalsTo?: string;
  winningProposalsTo?: string;
  ratingScale?: RatingScale;
}

export default function ProfileStatsSection({
  stats,
  watchedCount,
  watchedPending = false,
  watchedTo,
  proposalsTo,
  winningProposalsTo,
  ratingScale = 'five',
}: Readonly<Props>) {
  const { t, locale } = useTranslation();

  const counted = (
    key: string,
    value: number,
    one: TranslationKey,
    many: TranslationKey,
    to?: string
  ): Figure => ({ key, value, label: pluralizeCount(value, one, many, t), to });

  const figures: Figure[] = [
    ...(watchedCount
      ? [
          counted(
            'watched',
            watchedCount,
            'profile.stats.figures.watchedOne',
            'profile.stats.figures.watched',
            watchedTo
          ),
        ]
      : []),
    counted(
      'eventsCreated',
      stats.eventsCreated,
      'profile.stats.figures.eventsCreatedOne',
      'profile.stats.figures.eventsCreated'
    ),
    counted(
      'eventsJoined',
      stats.eventsJoined,
      'profile.stats.figures.eventsJoinedOne',
      'profile.stats.figures.eventsJoined'
    ),
    counted(
      'moviesProposed',
      stats.moviesProposed,
      'profile.stats.figures.moviesProposedOne',
      'profile.stats.figures.moviesProposed',
      proposalsTo
    ),
    counted(
      'winningProposals',
      stats.winningProposals,
      'profile.stats.figures.winningProposalsOne',
      'profile.stats.figures.winningProposals',
      winningProposalsTo
    ),
    ...(stats.proposalsAverageRating == null
      ? []
      : [
          {
            key: 'proposalsAverageRating',
            value: stats.proposalsAverageRating,
            label: t('profile.stats.figures.proposalsAverageRating'),
            display: formatRating(stats.proposalsAverageRating, ratingScale, locale, {
              decimals: 1,
            }),
          },
        ]),
    counted(
      'votes',
      stats.votesCast,
      'profile.stats.figures.votesOne',
      'profile.stats.figures.votes'
    ),
  ];

  const hasAnyData = figures.some((figure) => figure.value > 0);

  return (
    <section className={styles.stats} aria-labelledby="profile-stats-heading">
      <h2 id="profile-stats-heading" className="visually-hidden">
        {t('profile.stats.title')}
      </h2>

      {hasAnyData ? (
        <ul className={styles.figures}>
          {watchedPending && (
            <li className={styles.figure} aria-hidden="true">
              <span className={styles.value}>
                <Skeleton variant="text" className={styles.pendingValue} />
              </span>
              <span className={styles.label}>
                <Skeleton variant="text" className={styles.pendingLabel} />
              </span>
            </li>
          )}
          {figures.map((figure) => {
            const content = (
              <>
                <span className={styles.value}>{figure.display ?? figure.value}</span>
                <span className={styles.label}>{figure.label}</span>
              </>
            );
            return (
              <li key={figure.key} className={styles.figure}>
                {figure.to && figure.value > 0 ? (
                  <Link to={figure.to} className={styles.figureLink}>
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>{t('profile.stats.empty')}</p>
      )}
    </section>
  );
}

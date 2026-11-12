import { Link } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { TranslationKey } from '@/shared/i18n/t';
import type { UserStats } from '@/features/events/api/userStatsApi';
import styles from './ProfileStatsSection.module.css';

interface Figure {
  key: string;
  value: number;
  one: TranslationKey;
  many: TranslationKey;
  to?: string;
}

interface Props {
  stats: UserStats;
  watchedCount?: number;
  watchedTo: string;
}

export default function ProfileStatsSection({ stats, watchedCount, watchedTo }: Readonly<Props>) {
  const { t } = useTranslation();

  const figures: Figure[] = [
    ...(watchedCount
      ? [
          {
            key: 'watched',
            value: watchedCount,
            one: 'profile.stats.figures.watchedOne',
            many: 'profile.stats.figures.watched',
            to: watchedTo,
          } satisfies Figure,
        ]
      : []),
    {
      key: 'eventsCreated',
      value: stats.eventsCreated,
      one: 'profile.stats.figures.eventsCreatedOne',
      many: 'profile.stats.figures.eventsCreated',
    },
    {
      key: 'eventsJoined',
      value: stats.eventsJoined,
      one: 'profile.stats.figures.eventsJoinedOne',
      many: 'profile.stats.figures.eventsJoined',
    },
    {
      key: 'moviesProposed',
      value: stats.moviesProposed,
      one: 'profile.stats.figures.moviesProposedOne',
      many: 'profile.stats.figures.moviesProposed',
    },
    {
      key: 'winningProposals',
      value: stats.winningProposals,
      one: 'profile.stats.figures.winningProposalsOne',
      many: 'profile.stats.figures.winningProposals',
    },
    {
      key: 'votes',
      value: stats.votesCast,
      one: 'profile.stats.figures.votesOne',
      many: 'profile.stats.figures.votes',
    },
  ];

  const hasAnyData = figures.some((figure) => figure.value > 0);

  return (
    <section className={styles.stats} aria-labelledby="profile-stats-heading">
      <h2 id="profile-stats-heading" className="visually-hidden">
        {t('profile.stats.title')}
      </h2>

      {hasAnyData ? (
        <ul className={styles.figures}>
          {figures.map((figure) => {
            const label = pluralizeCount(figure.value, figure.one, figure.many, t);
            const content = (
              <>
                <span className={styles.value}>{figure.value}</span>
                <span className={styles.label}>{label}</span>
              </>
            );
            return (
              <li key={figure.key} className={styles.figure}>
                {figure.to ? (
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

import { lazy, Suspense, type ReactNode } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { CalendarDays, ChevronRight, Film, Plus, Star, Trophy } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { buttonClass } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { RatingScale } from '@/shared/types/theme';
import { formatRating } from '@/shared/utils/formatRating';
import type { UserStats } from '@/features/events/api/userStatsApi';
import styles from './ProfileStatsSection.module.css';

const ProfileRhythm = lazy(() => import('./ProfileRhythm'));
const ProfileGenres = lazy(() => import('./ProfileGenres'));

export const PROFILE_STATS_ID = 'profile-stats';
const HEADING_ID = 'profile-stats-heading';

interface Figure {
  key: string;
  icon: ReactNode;
  value: string;
  label: string;
  detail?: string;
  to?: string;
}

interface Props {
  stats: UserStats;
  memberSince: string;
  proposalsTo: string;
  winningProposalsTo: string;
  winningProposalsHidden?: boolean;
  ratingScale?: RatingScale;
  isOwnProfile?: boolean;
}

function nightsDetail(hosted: number, joined: number, t: Translate): string {
  if (hosted > 0 && joined > 0) {
    return t('profile.stats.figures.split', {
      hosted: pluralizeCount(
        hosted,
        'profile.stats.figures.hostedOne',
        'profile.stats.figures.hosted',
        t
      ),
      joined: pluralizeCount(
        joined,
        'profile.stats.figures.joinedOne',
        'profile.stats.figures.joined',
        t
      ),
    });
  }
  if (hosted > 0) {
    return pluralizeCount(
      hosted,
      'profile.stats.figures.onlyHostedOne',
      'profile.stats.figures.onlyHosted',
      t
    );
  }
  return pluralizeCount(
    joined,
    'profile.stats.figures.onlyJoinedOne',
    'profile.stats.figures.onlyJoined',
    t
  );
}

function FigureBody({ figure }: Readonly<{ figure: Figure }>) {
  return (
    <>
      <span className={styles.figureIcon} aria-hidden>
        {figure.icon}
      </span>
      <span className={styles.value}>{figure.value}</span>
      <span className={styles.label}>
        {figure.label}
        {figure.to && <ChevronRight size={ICON_SIZE.md} aria-hidden />}
      </span>
      {figure.detail && <span className={styles.detail}>{figure.detail}</span>}
    </>
  );
}

export default function ProfileStatsSection({
  stats,
  memberSince,
  proposalsTo,
  winningProposalsTo,
  winningProposalsHidden = false,
  ratingScale = 'five',
  isOwnProfile = false,
}: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const nights = stats.eventsCreated + stats.eventsJoined;
  const hasAnyData = nights > 0 || stats.moviesProposed > 0;
  if (!hasAnyData && !isOwnProfile) return null;

  const integer = new Intl.NumberFormat(locale);
  const ratio = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const showWinning = !winningProposalsHidden && stats.winningProposals > 0;
  const rating = winningProposalsHidden ? null : stats.proposalsAverageRating;

  const figures: Figure[] = [];
  if (nights > 0) {
    figures.push({
      key: 'nights',
      icon: <CalendarDays size={ICON_SIZE.xl} />,
      value: integer.format(nights),
      label: pluralizeCount(
        nights,
        'profile.stats.figures.nightsOne',
        'profile.stats.figures.nights',
        t
      ),
      detail: nightsDetail(stats.eventsCreated, stats.eventsJoined, t),
    });
  }
  if (stats.moviesProposed > 0) {
    figures.push({
      key: 'proposed',
      icon: <Film size={ICON_SIZE.xl} />,
      value: integer.format(stats.moviesProposed),
      label: pluralizeCount(
        stats.moviesProposed,
        'profile.stats.figures.proposedOne',
        'profile.stats.figures.proposed',
        t
      ),
      detail:
        nights > 0
          ? t('profile.stats.figures.perNight', {
              count: ratio.format(stats.moviesProposed / nights),
            })
          : undefined,
      to: proposalsTo,
    });
  }
  if (showWinning) {
    figures.push({
      key: 'winning',
      icon: <Trophy size={ICON_SIZE.xl} />,
      value: integer.format(stats.winningProposals),
      label: pluralizeCount(
        stats.winningProposals,
        'profile.stats.figures.winningOne',
        'profile.stats.figures.winning',
        t
      ),
      detail:
        stats.moviesProposed > 0
          ? t('profile.stats.figures.winRate', {
              percent: percent.format(stats.winningProposals / stats.moviesProposed),
            })
          : undefined,
      to: winningProposalsTo,
    });
  }
  if (rating != null) {
    figures.push({
      key: 'rating',
      icon: <Star size={ICON_SIZE.xl} />,
      value: formatRating(rating, ratingScale, locale, { decimals: 1 }),
      label: t('profile.stats.figures.rating'),
      detail: t('profile.stats.figures.ratingDetail'),
    });
  }

  const hasActivity = stats.dailyActivity.some((point) => point.count > 0);

  return (
    <section id={PROFILE_STATS_ID} className={styles.stats} aria-labelledby={HEADING_ID}>
      <div className={styles.head}>
        <h2 id={HEADING_ID} className={styles.title}>
          {t('profile.stats.title')}
        </h2>
        {hasAnyData && memberSince && (
          <span className={styles.since}>{t('profile.stats.since', { date: memberSince })}</span>
        )}
      </div>

      {hasAnyData ? (
        <>
          <ul className={styles.figures} aria-label={t('profile.stats.figuresLabel')}>
            {figures.map((figure) => (
              <li key={figure.key} className={styles.figure}>
                {figure.to ? (
                  <Link to={figure.to} className={clsx(styles.cell, styles.cellLink)}>
                    <FigureBody figure={figure} />
                  </Link>
                ) : (
                  <div className={styles.cell}>
                    <FigureBody figure={figure} />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {(hasActivity || stats.moviesProposed > 0) && (
            <div className={styles.charts}>
              <Suspense fallback={null}>
                {hasActivity && (
                  <ProfileRhythm
                    points={stats.dailyActivity}
                    streakWeeks={stats.currentStreakWeeks}
                    bestStreakWeeks={stats.bestStreakWeeks}
                  />
                )}
                <ProfileGenres
                  genres={stats.favoriteGenres}
                  moviesProposed={stats.moviesProposed}
                />
              </Suspense>
            </div>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyText}>{t('profile.stats.emptyOwner')}</p>
          <Link to={ROUTES.createEvent} className={buttonClass({ variant: 'primary' })}>
            <Plus size={ICON_SIZE.lg} aria-hidden />
            {t('profile.stats.createEvent')}
          </Link>
        </div>
      )}
    </section>
  );
}

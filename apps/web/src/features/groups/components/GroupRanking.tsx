import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Star, Trophy } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import EmptyState from '@/shared/components/EmptyState';
import InlineError from '@/shared/components/InlineError';
import ProgressBar from '@/shared/components/ProgressBar';
import { Skeleton, SkeletonScreen } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { RatingScale } from '@/shared/types/theme';
import { formatRating } from '@/shared/utils/formatRating';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type {
  FriendGroupDetail,
  FriendGroupMember,
  FriendGroupMemberStats,
} from '@/features/groups/api/groupsApi';
import { useGroupRanking } from '@/features/groups/hooks/useGroups';
import {
  RANKING_MINIMUMS,
  RANKING_STATS,
  rankMembers,
  type RankedMember,
  type RankingStat,
  type UnrankedMember,
} from '@/features/groups/utils/groupRanking';
import styles from './GroupRanking.module.css';

const PODIUM_SIZE = 3;
const PODIUM_AVATAR = ['lg', 'md', 'md'] as const;
const PLACE_CLASS = [styles.place1, styles.place2, styles.place3];
const PERCENT = 100;

interface Formatting {
  t: Translate;
  locale: string;
  scale: RatingScale;
}

function scoreText(stat: RankingStat, entry: RankedMember, { locale, scale }: Formatting): string {
  switch (stat) {
    case 'rating':
      return formatRating(entry.stats.proposalsAverageRating ?? 0, scale, locale, { decimals: 1 });
    case 'generous':
      return formatRating(entry.stats.averageRatingGiven ?? 0, scale, locale, { decimals: 1 });
    case 'votes':
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(entry.score);
    case 'flair':
    case 'fresh':
      return new Intl.NumberFormat(locale, { style: 'percent' }).format(entry.score / PERCENT);
    case 'wins':
    case 'presence':
    case 'host':
      return new Intl.NumberFormat(locale).format(entry.score);
  }
}

function detailText(stat: RankingStat, stats: FriendGroupMemberStats, t: Translate): string {
  switch (stat) {
    case 'rating':
      return pluralizeCount(
        stats.ratedWinningCount,
        'groups.ranking.details.ratedFilmsOne',
        'groups.ranking.details.ratedFilms',
        t
      );
    case 'wins':
      return pluralizeCount(
        stats.proposedCount,
        'groups.ranking.details.proposedOne',
        'groups.ranking.details.proposed',
        t
      );
    case 'votes':
      return pluralizeCount(
        stats.proposedCount,
        'groups.ranking.details.votesPerFilmOne',
        'groups.ranking.details.votesPerFilm',
        t
      );
    case 'flair':
      return t('groups.ranking.details.votesOnWinner', {
        part: stats.upVotesOnWinner,
        count: stats.upVotesCast,
      });
    case 'fresh':
      return pluralizeCount(
        stats.proposedCount,
        'groups.ranking.details.freshOne',
        'groups.ranking.details.fresh',
        t,
        { part: stats.freshProposalCount }
      );
    case 'presence':
      return pluralizeCount(
        stats.nightsAttended,
        'groups.ranking.details.presenceOne',
        'groups.ranking.details.presence',
        t
      );
    case 'host':
      return pluralizeCount(
        stats.nightsHosted,
        'groups.ranking.details.hostedOne',
        'groups.ranking.details.hosted',
        t
      );
    case 'generous':
      return pluralizeCount(
        stats.ratingsGiven,
        'groups.ranking.details.ratingsGivenOne',
        'groups.ranking.details.ratingsGiven',
        t
      );
  }
}

function reasonText({ reason, stats }: UnrankedMember, t: Translate): string {
  switch (reason) {
    case 'notEnoughRatedFilms':
      return stats.ratedWinningCount === 0
        ? t('groups.ranking.reasons.noRatedFilm')
        : pluralizeCount(
            stats.ratedWinningCount,
            'groups.ranking.reasons.notEnoughRatedFilmsOne',
            'groups.ranking.reasons.notEnoughRatedFilms',
            t,
            { min: RANKING_MINIMUMS.ratedFilms }
          );
    case 'notEnoughVotes':
      return stats.upVotesCast === 0
        ? t('groups.ranking.reasons.noVote')
        : pluralizeCount(
            stats.upVotesCast,
            'groups.ranking.reasons.notEnoughVotesOne',
            'groups.ranking.reasons.notEnoughVotes',
            t,
            { min: RANKING_MINIMUMS.upVotes }
          );
    case 'notEnoughRatings':
      return stats.ratingsGiven === 0
        ? t('groups.ranking.reasons.noRating')
        : pluralizeCount(
            stats.ratingsGiven,
            'groups.ranking.reasons.notEnoughRatingsOne',
            'groups.ranking.reasons.notEnoughRatings',
            t,
            { min: RANKING_MINIMUMS.ratingsGiven }
          );
    case 'noWinningFilm':
    case 'noProposal':
    case 'noNight':
      return t(`groups.ranking.reasons.${reason}`);
  }
}

function rankedDetail(stat: RankingStat, entry: RankedMember, t: Translate): string {
  const detail = detailText(stat, entry.stats, t);
  return entry.tied ? t('groups.ranking.tied', { detail }) : detail;
}

function Score({ stat, children }: Readonly<{ stat: RankingStat; children: ReactNode }>) {
  return (
    <>
      {children}
      {stat === 'rating' || stat === 'generous' ? (
        <Star size={ICON_SIZE.sm} aria-hidden className={styles.star} />
      ) : null}
    </>
  );
}

interface RankingBoardProps {
  stat: RankingStat;
  members: readonly FriendGroupMemberStats[];
  people: ReadonlyMap<string, FriendGroupMember>;
  viewerId: string | undefined;
  formatting: Formatting;
}

function RankingBoard({
  stat,
  members,
  people,
  viewerId,
  formatting,
}: Readonly<RankingBoardProps>) {
  const { t } = formatting;
  const { ranked, unranked } = rankMembers(stat, members, formatting.scale);
  const podium = ranked.slice(0, PODIUM_SIZE);
  const rest = ranked.slice(PODIUM_SIZE);
  const person = (userId: string) => people.get(userId);
  const nameOf = (member: FriendGroupMember) =>
    member.userId === viewerId ? t('groups.members.you') : member.displayName;

  return (
    <Card padding="md" radius="lg" className={styles.board}>
      <div className={styles.question}>
        <p className={styles.questionText}>{t(`groups.ranking.stats.${stat}.question`)}</p>
        <p className={styles.how}>{t(`groups.ranking.stats.${stat}.how`)}</p>
      </div>
      {ranked.length === 0 ? <p className={styles.nobody}>{t('groups.ranking.nobody')}</p> : null}
      {podium.length > 0 ? (
        <ol className={styles.podium} aria-label={t('groups.ranking.podiumAria')}>
          {podium.map((entry, index) => {
            const member = person(entry.stats.userId);
            if (!member) return null;
            return (
              <li
                key={member.userId}
                className={clsx(
                  styles.place,
                  PLACE_CLASS[index],
                  member.userId === viewerId && styles.viewer
                )}
              >
                <span className="visually-hidden">
                  {entry.rank === 1
                    ? t('groups.ranking.placeFirst')
                    : t('groups.ranking.place', { rank: entry.rank })}
                </span>
                <span className={styles.placeAvatar}>
                  <Avatar
                    avatarId={member.avatarId}
                    pseudo={member.displayName}
                    size={PODIUM_AVATAR[index] ?? 'md'}
                  />
                </span>
                <span className={styles.placeName}>{nameOf(member)}</span>
                <span className={styles.placeValue}>
                  <Score stat={stat}>{scoreText(stat, entry, formatting)}</Score>
                </span>
                <span className={styles.placeDetail}>{rankedDetail(stat, entry, t)}</span>
                <span className={styles.step} aria-hidden="true">
                  {entry.rank}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {rest.length > 0 ? (
        <ol className={styles.rows}>
          {rest.map((entry) => {
            const member = person(entry.stats.userId);
            if (!member) return null;
            return (
              <li
                key={member.userId}
                className={clsx(styles.row, member.userId === viewerId && styles.viewer)}
              >
                <span className={styles.rank}>{entry.rank}</span>
                <Avatar avatarId={member.avatarId} pseudo={member.displayName} size="md" />
                <span className={styles.who}>
                  <span className={styles.name}>{nameOf(member)}</span>
                  <span className={styles.detail}>{rankedDetail(stat, entry, t)}</span>
                </span>
                <ProgressBar
                  value={entry.share}
                  tone="primary"
                  className={styles.bar}
                  label={
                    <span className={styles.value}>
                      <Score stat={stat}>{scoreText(stat, entry, formatting)}</Score>
                    </span>
                  }
                />
              </li>
            );
          })}
        </ol>
      ) : null}
      {unranked.length > 0 ? (
        <div className={styles.unranked}>
          <p className={styles.unrankedLabel}>{t('groups.ranking.unranked')}</p>
          <ul className={styles.rows}>
            {unranked.map((entry) => {
              const member = person(entry.stats.userId);
              if (!member) return null;
              return (
                <li key={member.userId} className={clsx(styles.row, styles.off)}>
                  <span className={styles.rank} />
                  <Avatar avatarId={member.avatarId} pseudo={member.displayName} size="md" />
                  <span className={styles.who}>
                    <span className={styles.name}>{nameOf(member)}</span>
                    <span className={styles.detail}>{reasonText(entry, t)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

export default function GroupRanking({
  group,
  viewerId,
}: Readonly<{ group: FriendGroupDetail; viewerId: string | undefined }>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useAuth();
  const [stat, setStat] = useState<RankingStat>('rating');
  const query = useGroupRanking(group.id);
  const ranking = query.data;
  const scope =
    ranking && ranking.nightCount > 0
      ? pluralizeCount(ranking.nightCount, 'groups.ranking.scopeOne', 'groups.ranking.scope', t)
      : null;

  let body: ReactNode;
  if (query.isError) {
    body = (
      <InlineError
        message={t('groups.ranking.loadError')}
        retryLabel={t('groups.ranking.retry')}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (!ranking) {
    body = (
      <SkeletonScreen label={t('groups.ranking.loading')}>
        <Skeleton variant="block" className={styles.skeleton} />
      </SkeletonScreen>
    );
  } else if (ranking.nightCount === 0) {
    body = (
      <EmptyState
        compact
        icon={<Trophy size={ICON_SIZE['2xl']} />}
        title={t('groups.ranking.emptyTitle')}
        message={t('groups.ranking.emptyMessage')}
      />
    );
  } else {
    body = (
      <>
        <fieldset className={styles.chips}>
          <legend className="visually-hidden">{t('groups.ranking.statsAria')}</legend>
          {RANKING_STATS.map((key) => (
            <Chip key={key} onClick={() => setStat(key)} selected={key === stat}>
              {t(`groups.ranking.stats.${key}.label`)}
            </Chip>
          ))}
        </fieldset>
        <RankingBoard
          stat={stat}
          members={ranking.members}
          people={new Map(group.members.map((member) => [member.userId, member]))}
          viewerId={viewerId}
          formatting={{ t, locale, scale: user?.ratingScale ?? 'five' }}
        />
      </>
    );
  }

  return (
    <div className={styles.panel}>
      {scope ? <p className={styles.scope}>{scope}</p> : null}
      {body}
    </div>
  );
}

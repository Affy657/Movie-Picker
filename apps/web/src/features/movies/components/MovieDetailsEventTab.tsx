import clsx from 'clsx';
import { Link } from 'react-router';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import Avatar from '@/shared/components/Avatar';
import Tooltip from '@/shared/components/Tooltip';
import { useLocale } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';
import { SeenButton, type Translate } from '@/features/movies/components/movieCardParts';
import styles from './MovieDetailsEventTab.module.css';

export interface MovieDetailsEventContext {
  movie: MovieData;
  canAct: boolean;
  participantCount?: number;
  onVote: (value: 1 | -1) => void;
  iMarkedSeen: boolean;
  seenPending: boolean;
  onToggleSeen: () => void;
  seenOthers: string[];
  seenOthersHint: string | null;
  avatarsByPseudo?: Record<string, string>;
  proposerAvatarId: string;
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  wheelExclusion?: { excluded: boolean; onToggle: () => void };
  canRemove: boolean;
  isMine: boolean;
  isHost: boolean;
  onRemove: () => void;
}

function formatAddedOnDate(isoDate: string | undefined, localeTag: string): string | null {
  if (!isoDate) return null;
  const dt = new Date(isoDate);
  if (Number.isNaN(dt.getTime())) return null;
  return new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'long' }).format(dt);
}

export default function MovieDetailsEventTab({
  movie,
  context,
  t,
}: Readonly<{
  movie: MovieData;
  context: MovieDetailsEventContext;
  t: Translate;
}>) {
  const { locale } = useLocale();
  const total = movie.up + movie.down;
  const upRatio = total > 0 ? (movie.up / total) * 100 : 0;
  const downRatio = total > 0 ? (movie.down / total) * 100 : 0;
  const abstain =
    context.participantCount != null
      ? Math.max(0, context.participantCount - movie.up - movie.down)
      : null;
  const breakdownText =
    abstain != null
      ? t('movies.details.voteBreakdownFull', { up: movie.up, down: movie.down, abstain })
      : t('movies.list.voteBreakdownAria', { up: movie.up, down: movie.down });
  const votersUp = movie.votersUpPseudos ?? [];
  const addedOnLabel = formatAddedOnDate(movie.createdAt, locale === 'fr' ? 'fr-FR' : 'en-GB');

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <p className={styles.rowLabel}>{t('movies.details.scoreLabel')}</p>
        <span
          className={clsx(
            styles.scoreValue,
            movie.score > 0 && styles.scorePositive,
            movie.score < 0 && styles.scoreNegative
          )}
        >
          {movie.score > 0 ? `+${movie.score}` : movie.score}
        </span>
        {total > 0 && (
          <span className={styles.scoreBar}>
            <span className={styles.scoreBarUp} style={{ flexBasis: `${upRatio}%` }} />
            <span className={styles.scoreBarDown} style={{ flexBasis: `${downRatio}%` }} />
          </span>
        )}
        <span className={styles.rowHint}>{breakdownText}</span>
      </div>

      {votersUp.length > 0 && (
        <div className={styles.row}>
          <p className={styles.rowLabel}>{t('movies.details.votersUpLabel')}</p>
          <span className={styles.avatarStack}>
            {votersUp.slice(0, 3).map((pseudo) => (
              <Avatar
                key={pseudo}
                avatarId={context.avatarsByPseudo?.[pseudo] ?? ''}
                pseudo={pseudo}
                size="xs"
                className={styles.avatarStackItem}
              />
            ))}
          </span>
          <span className={styles.rowHint}>{votersUp.join(', ')}</span>
        </div>
      )}

      {context.canAct && (
        <div className={styles.row}>
          <p className={styles.rowLabel}>{t('movies.details.myVoteLabel')}</p>
          <span className={styles.voteButtons}>
            <button
              type="button"
              className={clsx(styles.voteBtn, movie.myVote === 1 && styles.voteBtnUpActive)}
              onClick={() => context.onVote(1)}
              aria-pressed={movie.myVote === 1}
            >
              <ThumbsUp aria-hidden size={16} />
              <span className={styles.voteBtnLabel}>{t('movies.list.voteUp')}</span>
            </button>
            <button
              type="button"
              className={clsx(styles.voteBtn, movie.myVote === -1 && styles.voteBtnDownActive)}
              onClick={() => context.onVote(-1)}
              aria-pressed={movie.myVote === -1}
            >
              <ThumbsDown aria-hidden size={16} />
              <span className={styles.voteBtnLabel}>{t('movies.list.voteDown')}</span>
            </button>
          </span>
        </div>
      )}

      <div className={styles.row}>
        <p className={styles.rowLabel}>{t('movies.seen.label')}</p>
        {context.canAct ? (
          <SeenButton
            m={movie}
            iMarkedSeen={context.iMarkedSeen}
            seenPending={context.seenPending}
            onToggle={context.onToggleSeen}
            others={context.seenOthers}
            othersHint={context.seenOthersHint}
            avatarsByPseudo={context.avatarsByPseudo}
            alwaysShowCount
            t={t}
          />
        ) : (
          context.seenOthersHint && <p className={styles.rowHint}>{context.seenOthersHint}</p>
        )}
      </div>

      <div className={styles.row}>
        <p className={styles.rowLabel}>{t('movies.details.proposedByLabel')}</p>
        {movie.proposerHandle ? (
          <Tooltip label={movie.proposerPseudo}>
            <Link
              to={ROUTES.profile(movie.proposerHandle)}
              className={clsx(styles.proposer, styles.proposerLink)}
              aria-label={t('movies.details.viewProposerProfileAria', {
                pseudo: movie.proposerPseudo,
              })}
            >
              <Avatar avatarId={context.proposerAvatarId} pseudo={movie.proposerPseudo} size="xs" />
              <span className={styles.proposerName}>{movie.proposerPseudo}</span>
            </Link>
          </Tooltip>
        ) : (
          <span className={styles.proposer}>
            <Avatar avatarId={context.proposerAvatarId} pseudo={movie.proposerPseudo} size="xs" />
            <span className={styles.proposerName}>{movie.proposerPseudo}</span>
          </span>
        )}
        {addedOnLabel && (
          <span className={styles.rowHint}>
            {t('movies.details.addedOnLabel', { date: addedOnLabel })}
          </span>
        )}
      </div>
    </div>
  );
}

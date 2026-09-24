import SeenButton from '@/features/movies/components/SeenButton';
import { Fragment, memo } from 'react';
import clsx from 'clsx';
import { AlertTriangle, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react';
import Chip from '@/shared/components/Chip';
import {
  CardModals,
  CardSelectionOverlay,
  isSelectable,
  type MovieCardCommonProps,
  MovieCardKebab,
  PosterDetailsTrigger,
  ProposerBadge,
  useMovieCardState,
  VoteBar,
  WatchlistBadge,
  winnerBadgeLabel,
  WinnerRibbon,
} from '@/features/movies/components/movieCardParts';
import Tooltip from '@/shared/components/Tooltip';
import {
  MovieTableAvailability,
  MovieTableHeader,
  MovieTablePoster,
  type MovieTableColumn,
} from '@/features/movies/components/MovieTable';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { yearFromDate } from '@/shared/utils/formatReleaseDate';
import cardPartsStyles from './movieCardParts.module.css';
import table from './MovieTable.module.css';
import styles from './EventMovieRow.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { Translate } from '@/shared/i18n';
import ScoreBar from '@/features/movies/components/ScoreBar';

type RowSortKey =
  'createdAt' | 'voteAverage' | 'duration' | 'score' | 'availability' | 'seen' | 'releaseDate';

export interface EventMovieRowHeaderColumn {
  key: RowSortKey;
  label: string;
}

export interface EventMovieRowHeaderProps {
  columns: EventMovieRowHeaderColumn[];
  sortBy: RowSortKey;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: RowSortKey) => void;
}

export function EventMovieRowHeader({
  columns,
  sortBy,
  sortDir,
  onSetSort,
}: Readonly<EventMovieRowHeaderProps>) {
  const byKey = Object.fromEntries(columns.map((c) => [c.key, c.label])) as Record<
    RowSortKey,
    string
  >;
  const sort = (key: RowSortKey) => [{ key, label: byKey[key] }];
  const layout: MovieTableColumn<RowSortKey>[] = [
    { id: 'rank' },
    { id: 'poster' },
    { id: 'title', sorts: sort('createdAt'), inset: true },
    { id: 'vote', sorts: sort('voteAverage'), align: 'end' },
    { id: 'runtime', sorts: sort('duration'), align: 'end' },
    { id: 'release', sorts: sort('releaseDate'), align: 'end' },
    { id: 'availability', sorts: sort('availability'), inset: true },
    { id: 'votes' },
    { id: 'seen', sorts: sort('seen'), align: 'center' },
    { id: 'score', sorts: sort('score'), align: 'end' },
    { id: 'actions' },
  ];

  return (
    <MovieTableHeader
      columns={layout}
      sortBy={sortBy}
      sortDir={sortDir}
      onSetSort={onSetSort}
      gridClassName={styles.rowGrid}
    />
  );
}

function ScoreBlock({ m, t }: Readonly<{ m: MovieCardCommonProps['movie']; t: Translate }>) {
  const total = m.up + m.down;
  const upRatio = total > 0 ? (m.up / total) * 100 : 0;
  const downRatio = total > 0 ? (m.down / total) * 100 : 0;
  const breakdown = t('movies.list.voteBreakdownAria', { up: m.up, down: m.down });
  const scoreNode = (
    <span className={styles.scoreBlock}>
      <span
        className={clsx(
          styles.scoreValue,
          m.score > 0 && styles.scorePositive,
          m.score < 0 && styles.scoreNegative
        )}
      >
        {m.score > 0 ? `+${m.score}` : m.score}
      </span>
      <ScoreBar upRatio={upRatio} downRatio={downRatio} className={styles.scoreBar} />
    </span>
  );
  if (total === 0) return scoreNode;
  return (
    <Tooltip label={breakdown} placement="top">
      {scoreNode}
    </Tooltip>
  );
}

function VoteReadonly({ m }: Readonly<{ m: MovieCardCommonProps['movie'] }>) {
  return (
    <span className={styles.voteReadonly}>
      <ThumbsUp aria-hidden size={ICON_SIZE.sm} />
      <span>{m.up}</span>
      <ThumbsDown aria-hidden size={ICON_SIZE.sm} />
      <span>{m.down}</span>
    </span>
  );
}

export interface MovieRowVoteError {
  message: string;
  onRetry: () => void;
}

export interface EventMovieRowProps extends MovieCardCommonProps {
  isMobile: boolean;
  rank?: number;
  voteError?: MovieRowVoteError;
}

function VoteErrorBanner({
  voteError,
  t,
}: Readonly<{ voteError: MovieRowVoteError; t: Translate }>) {
  return (
    <li className={styles.errorBanner}>
      <AlertTriangle aria-hidden size={ICON_SIZE.md} className={styles.errorIcon} />
      <p className={styles.errorMessage}>{voteError.message}</p>
      <button type="button" className={styles.errorRetry} onClick={voteError.onRetry}>
        <RotateCcw aria-hidden size={ICON_SIZE.sm} />
        <span>{t('movies.list.retryVoteAction')}</span>
      </button>
    </li>
  );
}

type EventMovieRowView = EventMovieRowProps & {
  s: ReturnType<typeof useMovieCardState>;
  posterSrc: string | undefined;
  posterSrcSet: string | undefined;
  flatrateProviders: EventMovieRowProps['movie']['watchProviders'];
  rentCount: number;
  buyCount: number;
  releaseDateLabel: string | undefined;
  excluded: boolean;
  selecting: boolean;
  emptyAvailabilityLabel: string;
  m: EventMovieRowProps['movie'];
};

function EventMovieRowMobile({
  s,
  posterSrc,
  posterSrcSet,
  flatrateProviders,
  rentCount,
  buyCount,
  excluded,
  selecting,
  emptyAvailabilityLabel,
  m,
  isHost,
  onVote,
  onRemove,
  t,
  participantAvatarsByPseudo,
  eager,
  isInWatchlist,
  onToggleWatchlist,
  onToggleWheelExclusion,
  selection,
  isWinner,
  winnerRank,
  voteLockedHint,
  voteError,
  participantCount,
}: Readonly<EventMovieRowView>) {
  return (
    <Fragment>
      <li
        className={clsx(
          table.mobileRow,
          isWinner && styles.rowWinner,
          !!voteError && styles.rowError,
          excluded && cardPartsStyles.excluded,
          selecting && cardPartsStyles.selectable
        )}
      >
        {excluded && (
          <span className="visually-hidden">{t('movies.list.excludedFromWheelSr')}</span>
        )}
        {selecting && selection ? (
          <CardSelectionOverlay movie={m} selection={selection} t={t} />
        ) : null}
        <div className={table.mobilePosterCol} inert={selecting}>
          <MovieTablePoster src={posterSrc} srcSet={posterSrcSet} eager={!!eager} />
          <PosterDetailsTrigger
            hasDetails={s.hasDetails}
            onOpen={() => s.openDetails('event')}
            title={m.title}
            t={t}
          />
          <WatchlistBadge inWatchlist={!!isInWatchlist} t={t} />
          <WinnerRibbon isWinner={isWinner} winnerRank={winnerRank} compact t={t} />
        </div>
        <div className={table.mobileContent} inert={selecting}>
          <div className={table.mobileTitleRow}>
            <h3 className={table.title} title={m.title}>
              {m.title}
            </h3>
          </div>
          <div className={table.mobileFacts}>
            {m.year ? <span>{m.year}</span> : null}
            {s.runtimeLabel ? <span>{s.runtimeLabel}</span> : null}
            {s.voteLabel ? <span>{s.voteLabel}</span> : null}
            <MovieTableAvailability
              flatrateProviders={flatrateProviders}
              rentCount={rentCount}
              buyCount={buyCount}
              watchPageUrl={m.tmdbWatchPageUrl}
              maxVisible={1}
              onMoreClick={() => s.openDetails('availability')}
              emptyLabel={emptyAvailabilityLabel}
              title={m.title}
              t={t}
            />
          </div>
          <div className={styles.mobileBottomSection}>
            <span className={styles.mobileVoteScore}>
              {s.canVote ? (
                <VoteBar m={m} onVote={onVote} t={t} lockedHint={voteLockedHint} />
              ) : (
                <VoteReadonly m={m} />
              )}
              <ScoreBlock m={m} t={t} />
            </span>
            <div className={styles.mobileProposerRow}>
              <ProposerBadge
                avatarId={s.proposerAvatarId}
                pseudo={m.proposerPseudo}
                handle={m.proposerHandle}
                t={t}
              />
              <span className={styles.mobileSeenSlot}>
                {s.canAct ? (
                  <SeenButton
                    m={m}
                    iMarkedSeen={s.iMarkedSeen}
                    seenPending={s.seenPending}
                    onToggle={() => void s.handleToggleSeen()}
                    others={s.others}
                    othersHint={s.othersHint}
                    avatarsByPseudo={participantAvatarsByPseudo}
                    t={t}
                  />
                ) : (
                  s.othersHint && <p className={styles.mobileSeenHint}>{s.othersHint}</p>
                )}
              </span>
            </div>
          </div>
        </div>
        <MovieCardKebab
          movie={m}
          card={s}
          slotClassName={styles.mobileMenuSlot ?? ''}
          isHost={isHost}
          isInWatchlist={isInWatchlist}
          onRemove={onRemove}
          onToggleWatchlist={onToggleWatchlist}
          onToggleWheelExclusion={onToggleWheelExclusion}
          trigger="disclosure"
          triggerClassName={table.disclosure}
          t={t}
        />
        <CardModals
          s={s}
          m={m}
          isHost={isHost}
          onVote={onVote}
          onRemove={onRemove}
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={onToggleWatchlist}
          onToggleWheelExclusion={onToggleWheelExclusion}
          avatarsByPseudo={participantAvatarsByPseudo}
          participantCount={participantCount}
        />
      </li>
      {voteError ? <VoteErrorBanner voteError={voteError} t={t} /> : null}
    </Fragment>
  );
}

function EventMovieRowDesktop({
  s,
  posterSrc,
  posterSrcSet,
  flatrateProviders,
  rentCount,
  buyCount,
  releaseDateLabel,
  excluded,
  selecting,
  emptyAvailabilityLabel,
  m,
  isHost,
  onVote,
  onRemove,
  t,
  participantAvatarsByPseudo,
  eager,
  isInWatchlist,
  onToggleWatchlist,
  onToggleWheelExclusion,
  selection,
  isWinner,
  winnerRank,
  voteLockedHint,
  rank,
  voteError,
  participantCount,
}: Readonly<EventMovieRowView>) {
  return (
    <Fragment>
      <li
        className={clsx(
          table.row,
          styles.rowGrid,
          isWinner && styles.rowWinner,
          !!voteError && styles.rowError,
          excluded && cardPartsStyles.excluded,
          selecting && cardPartsStyles.selectable
        )}
      >
        {excluded && (
          <span className="visually-hidden">{t('movies.list.excludedFromWheelSr')}</span>
        )}
        {selecting && selection ? (
          <CardSelectionOverlay movie={m} selection={selection} t={t} />
        ) : null}
        <span className={styles.rank} data-testid="movie-rank">
          {rank ?? ''}
        </span>
        <div className={table.posterCol} inert={selecting}>
          <MovieTablePoster src={posterSrc} srcSet={posterSrcSet} eager={!!eager} />
          <PosterDetailsTrigger
            hasDetails={s.hasDetails}
            onOpen={() => s.openDetails('event')}
            title={m.title}
            t={t}
          />
          <WatchlistBadge inWatchlist={!!isInWatchlist} t={t} />
        </div>
        <div className={table.titleCol} inert={selecting}>
          <div className={table.titleRow}>
            <h3 className={table.title} title={m.title}>
              {m.title}
            </h3>
          </div>
          <div className={table.metaRow}>
            <ProposerBadge
              avatarId={s.proposerAvatarId}
              pseudo={m.proposerPseudo}
              handle={m.proposerHandle}
              t={t}
            />
            {isWinner ? (
              <Chip tone="primary" size="sm" className={styles.winnerBadge}>
                {winnerBadgeLabel(t, winnerRank)}
              </Chip>
            ) : null}
          </div>
        </div>
        <span className={table.cellEnd}>{s.voteLabel}</span>
        <span className={table.cellEnd}>{s.runtimeLabel}</span>
        <span className={table.cellEnd}>{releaseDateLabel}</span>
        <div className={table.availabilityCol}>
          <MovieTableAvailability
            flatrateProviders={flatrateProviders}
            rentCount={rentCount}
            buyCount={buyCount}
            watchPageUrl={m.tmdbWatchPageUrl}
            maxVisible={2}
            chipMaxWidth="2.75rem"
            onMoreClick={() => s.openDetails('availability')}
            emptyLabel={emptyAvailabilityLabel}
            title={m.title}
            t={t}
          />
        </div>
        <div className={styles.votesCol} inert={selecting}>
          {s.canVote ? (
            <VoteBar m={m} onVote={onVote} t={t} lockedHint={voteLockedHint} />
          ) : (
            <VoteReadonly m={m} />
          )}
        </div>
        <div className={styles.seenCol} inert={selecting}>
          {s.canAct ? (
            <SeenButton
              m={m}
              iMarkedSeen={s.iMarkedSeen}
              seenPending={s.seenPending}
              onToggle={() => void s.handleToggleSeen()}
              others={s.others}
              othersHint={s.othersHint}
              avatarsByPseudo={participantAvatarsByPseudo}
              t={t}
            />
          ) : (
            s.othersHint && <p className={styles.seenHintCell}>{s.othersHint}</p>
          )}
        </div>
        <div className={styles.scoreCol}>
          <ScoreBlock m={m} t={t} />
        </div>
        <MovieCardKebab
          movie={m}
          card={s}
          slotClassName={table.kebabCol ?? ''}
          isHost={isHost}
          isInWatchlist={isInWatchlist}
          onRemove={onRemove}
          onToggleWatchlist={onToggleWatchlist}
          onToggleWheelExclusion={onToggleWheelExclusion}
          t={t}
        />
        <CardModals
          s={s}
          m={m}
          isHost={isHost}
          onVote={onVote}
          onRemove={onRemove}
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={onToggleWatchlist}
          onToggleWheelExclusion={onToggleWheelExclusion}
          avatarsByPseudo={participantAvatarsByPseudo}
          participantCount={participantCount}
        />
      </li>
      {voteError ? <VoteErrorBanner voteError={voteError} t={t} /> : null}
    </Fragment>
  );
}

export const EventMovieRow = memo(function EventMovieRow({
  movie: m,
  slug,
  participantId,
  canVote,
  participantPseudo,
  isFinished,
  isHost,
  onVote,
  onRemove,
  refresh,
  onActionError,
  t,
  participantAvatars,
  participantAvatarsByPseudo,
  ratingScale,
  eager = false,
  isInWatchlist,
  onToggleWatchlist,
  onToggleWheelExclusion,
  selection,
  isWinner = false,
  winnerRank,
  voteLockedHint,
  isMobile,
  rank,
  voteError,
  participantCount,
}: Readonly<EventMovieRowProps>) {
  const s = useMovieCardState({
    movie: m,
    slug,
    participantId,
    canVote,
    participantPseudo,
    isFinished,
    isHost,
    participantAvatars,
    ratingScale,
    refresh,
    onActionError,
    t,
  });
  const posterSrc = posterImageSrc(m.posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);
  const flatrateProviders = s.providers.filter((p) => p.type === 'flatrate');
  const rentCount = s.providers.filter((p) => p.type === 'rent').length;
  const buyCount = s.providers.filter((p) => p.type === 'buy').length;
  const releaseDateLabel = yearFromDate(m.releaseDate);
  const excluded = !!m.excludedFromWheel;
  const selecting = isSelectable(m, selection) && !excluded;
  const emptyAvailabilityLabel = t('movies.watchProviders.emptyLabel');

  const view: EventMovieRowView = {
    ...({
      movie: m,
      slug,
      participantId,
      canVote,
      participantPseudo,
      isFinished,
      isHost,
      onVote,
      onRemove,
      refresh,
      onActionError,
      t,
      participantAvatars,
      participantAvatarsByPseudo,
      ratingScale,
      eager,
      isInWatchlist,
      onToggleWatchlist,
      onToggleWheelExclusion,
      selection,
      isWinner,
      winnerRank,
      voteLockedHint,
      isMobile,
      rank,
      voteError,
      participantCount,
    } as EventMovieRowProps),
    s,
    posterSrc,
    posterSrcSet,
    flatrateProviders,
    rentCount,
    buyCount,
    releaseDateLabel,
    excluded,
    selecting,
    emptyAvailabilityLabel,
    m,
  };

  if (isMobile) return <EventMovieRowMobile {...view} />;
  return <EventMovieRowDesktop {...view} />;
});

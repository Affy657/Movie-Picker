import SeenButton from '@/features/events/components/SeenButton';
import { Fragment, memo } from 'react';
import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import EventProviderLogos from '@/features/events/components/EventProviderLogos';
import { MovieCardKebab, WatchlistBadge } from '@/features/movies/components/movieCardParts';
import {
  CardNote,
  CardProposerFooter,
  CardSelectionOverlay,
  isSelectable,
  type MovieCardCommonProps,
  noteRemoveAction,
  PosterDetailsTrigger,
  ScoreBlock,
  VoteCounts,
  VoteErrorNotice,
  type MovieVoteError,
  useMovieCardState,
  VoteBar,
  winnerBadgeLabel,
} from '@/features/events/components/eventMovieCardParts';
import {
  MovieTableHeader,
  MovieTablePoster,
  type MovieTableColumn,
} from '@/features/movies/components/MovieTable';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { yearFromDate } from '@/shared/utils/formatReleaseDate';
import cardPartsStyles from './eventMovieCardParts.module.css';
import table from '@/features/movies/components/MovieTable.module.css';
import styles from './EventMovieRow.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { Translate } from '@/shared/i18n';

type RowSortKey =
  | 'title'
  | 'createdAt'
  | 'voteAverage'
  | 'duration'
  | 'score'
  | 'availability'
  | 'seen'
  | 'releaseDate';

export interface EventMovieRowHeaderColumn {
  key: RowSortKey;
  label: string;
}

export interface EventMovieRowHeaderProps {
  columns: EventMovieRowHeaderColumn[];
  filmLabel: string;
  filmSortAriaLabel: string;
  sortBy: RowSortKey;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: RowSortKey) => void;
}

export function EventMovieRowHeader({
  columns,
  filmLabel,
  filmSortAriaLabel,
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
    {
      id: 'title',
      sorts: [...sort('title'), ...sort('createdAt')],
      inset: true,
      menuLabel: filmLabel,
      menuAriaLabel: filmSortAriaLabel,
    },
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

export interface EventMovieRowProps extends MovieCardCommonProps {
  rank?: number;
  voteError?: MovieVoteError;
}

function VoteErrorBanner({
  voteError,
  title,
  t,
}: Readonly<{ voteError: MovieVoteError; title: string; t: Translate }>) {
  return (
    <li className={styles.errorBanner}>
      <VoteErrorNotice voteError={voteError} title={title} t={t} />
    </li>
  );
}

type EventMovieRowView = EventMovieRowProps & {
  s: ReturnType<typeof useMovieCardState>;
  posterSrc: string | undefined;
  posterSrcSet: string | undefined;
  releaseDateLabel: string | undefined;
  excluded: boolean;
  selecting: boolean;
  m: EventMovieRowProps['movie'];
};

function EventMovieRowDesktop({
  s,
  posterSrc,
  posterSrcSet,
  releaseDateLabel,
  excluded,
  selecting,
  m,
  slug,
  participantId,
  onVote,
  onRemoveNote,
  refresh,
  onActionError,
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
}: Readonly<EventMovieRowView>) {
  return (
    <Fragment>
      <li
        className={clsx(
          table.row,
          styles.rowGrid,
          s.noteEditing && styles.rowWithNote,
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
          {isWinner ? (
            <Trophy
              role="img"
              aria-label={winnerBadgeLabel(t, winnerRank)}
              size={ICON_SIZE.lg}
              className={styles.rankTrophy}
            />
          ) : (
            (rank ?? '')
          )}
        </span>
        <div className={table.posterCol} inert={selecting}>
          <MovieTablePoster src={posterSrc} srcSet={posterSrcSet} eager={!!eager} />
          <PosterDetailsTrigger
            hasDetails={s.hasDetails}
            onOpen={() => s.openDetails()}
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
            <CardProposerFooter s={s} m={m} t={t} />
          </div>
          <div className={styles.note}>
            <CardNote
              s={s}
              m={m}
              slug={slug}
              participantId={participantId}
              refresh={refresh}
              onActionError={onActionError}
              t={t}
            />
          </div>
        </div>
        <span className={table.cellEnd}>{s.voteValue}</span>
        <span className={table.cellEnd}>{s.runtimeLabel}</span>
        <span className={table.cellEnd}>{releaseDateLabel}</span>
        <div className={table.availabilityCol}>
          <EventProviderLogos
            providers={m.watchProviders}
            slots={3}
            title={m.title}
            watchPageUrl={m.tmdbWatchPageUrl}
            onOpenDetails={() => s.openDetails()}
          />
        </div>
        <div className={styles.votesCol} inert={selecting}>
          {s.canVote ? (
            <VoteBar m={m} onVote={onVote} t={t} lockedHint={voteLockedHint} />
          ) : (
            <VoteCounts m={m} t={t} />
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
          alwaysVisible
          remove={s.kebabRemove}
          removeNote={noteRemoveAction(m, s.canRemove, onRemoveNote, t)}
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={onToggleWatchlist}
          onToggleWheelExclusion={onToggleWheelExclusion}
          t={t}
        />
      </li>
      {voteError ? <VoteErrorBanner voteError={voteError} title={m.title} t={t} /> : null}
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
  wheelLocked,
  isHost,
  onVote,
  onRemove,
  onRemoveNote,
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
  rank,
  voteError,
}: Readonly<EventMovieRowProps>) {
  const s = useMovieCardState({
    movie: m,
    slug,
    participantId,
    canVote,
    participantPseudo,
    isFinished,
    wheelLocked,
    isHost,
    participantAvatars,
    ratingScale,
    refresh,
    onRemove,
    onActionError,
    t,
  });
  const posterSrc = posterImageSrc(m.posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);
  const releaseDateLabel = yearFromDate(m.releaseDate);
  const excluded = !!m.excludedFromWheel;
  const selecting = isSelectable(m, selection) && !excluded;

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
      onRemoveNote,
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
      rank,
      voteError,
    } as EventMovieRowProps),
    s,
    posterSrc,
    posterSrcSet,
    releaseDateLabel,
    excluded,
    selecting,
    m,
  };

  return <EventMovieRowDesktop {...view} />;
});

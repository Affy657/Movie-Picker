import SeenButton from '@/features/movies/components/SeenButton';
import type { Translate } from '@/features/movies/types';
import { Fragment, memo } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Film,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import {
  CardModals,
  CardSelectionOverlay,
  DetailsInfoButton,
  MovieCardKebab,
  OverflowChip,
  PaidOfferChip,
  ProposerBadge,
  VoteBar,
  WatchlistBadge,
  useMovieCardState,
  type MovieCardCommonProps,
} from '@/features/movies/components/movieCardParts';
import Tooltip from '@/shared/components/Tooltip';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import cardPartsStyles from './movieCardParts.module.css';
import styles from './MovieCardRow.module.css';

function formatReleaseYear(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const year = isoDate.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

type RowSortKey =
  'createdAt' | 'voteAverage' | 'duration' | 'score' | 'availability' | 'seen' | 'releaseDate';

export interface MovieRowHeaderColumn {
  key: RowSortKey;
  label: string;
}

export interface MovieRowHeaderProps {
  columns: MovieRowHeaderColumn[];
  sortBy: RowSortKey;
  sortDir: 'asc' | 'desc';
  onSetSort: (key: RowSortKey) => void;
}

export function MovieRowHeader({
  columns,
  sortBy,
  sortDir,
  onSetSort,
}: Readonly<MovieRowHeaderProps>) {
  const byKey = Object.fromEntries(columns.map((c) => [c.key, c.label])) as Record<
    RowSortKey,
    string
  >;

  function headerButton(key: RowSortKey) {
    const active = sortBy === key;
    const DirectionIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        className={clsx(styles.colHeaderBtn, active && styles.colHeaderBtnActive)}
        aria-pressed={active}
        onClick={() => onSetSort(key)}
      >
        <span>{byKey[key]}</span>
        {active ? <DirectionIcon aria-hidden size={12} /> : null}
      </button>
    );
  }

  return (
    <div className={clsx(styles.row, styles.headerRow)}>
      <span />
      <span />
      <span className={clsx(styles.colHeaderCell, styles.colHeaderStart)}>
        {headerButton('createdAt')}
      </span>
      <span className={clsx(styles.colHeaderCell, styles.colHeaderEnd)}>
        {headerButton('voteAverage')}
      </span>
      <span className={clsx(styles.colHeaderCell, styles.colHeaderEnd)}>
        {headerButton('duration')}
      </span>
      <span className={clsx(styles.colHeaderCell, styles.colHeaderEnd)}>
        {headerButton('releaseDate')}
      </span>
      <span className={clsx(styles.colHeaderCell, styles.colHeaderStart, styles.colHeaderDispo)}>
        {headerButton('availability')}
      </span>
      <span />
      <span className={clsx(styles.colHeaderCell, styles.colHeaderCenter)}>
        {headerButton('seen')}
      </span>
      <span className={clsx(styles.colHeaderCell, styles.colHeaderEnd)}>
        {headerButton('score')}
      </span>
      <span />
    </div>
  );
}

function RowPoster({
  src,
  srcSet,
  eager,
}: Readonly<{ src: string | null | undefined; srcSet?: string; eager: boolean }>) {
  if (!src) {
    return (
      <div className={styles.posterPlaceholder} aria-hidden>
        <Film size={20} />
      </div>
    );
  }
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes="(max-width: 767px) 85px, 60px"
      alt=""
      className={styles.poster}
      width={60}
      height={90}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
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
      <span className={styles.scoreBar}>
        {upRatio > 0 && <span className={styles.scoreBarUp} style={{ flexBasis: `${upRatio}%` }} />}
        {downRatio > 0 && (
          <span className={styles.scoreBarDown} style={{ flexBasis: `${downRatio}%` }} />
        )}
      </span>
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
      <ThumbsUp aria-hidden size={14} />
      <span>{m.up}</span>
      <ThumbsDown aria-hidden size={14} />
      <span>{m.down}</span>
    </span>
  );
}

function RowDispo({
  flatrateProviders,
  rentCount,
  buyCount,
  watchPageUrl,
  maxVisible,
  chipMaxWidth,
  onMoreClick,
  emptyLabel,
  title,
  t,
}: Readonly<{
  flatrateProviders: MovieCardCommonProps['movie']['watchProviders'];
  rentCount: number;
  buyCount: number;
  watchPageUrl?: string | null;
  maxVisible: number;
  chipMaxWidth?: string;
  onMoreClick: () => void;
  emptyLabel: string;
  title: string;
  t: Translate;
}>) {
  const total = (flatrateProviders?.length ?? 0) + rentCount + buyCount;
  if (total === 0) {
    return <span className={styles.dispoEmpty}>{emptyLabel}</span>;
  }

  const visibleFlatrate = (flatrateProviders ?? []).slice(0, maxVisible);
  const hidden = total - visibleFlatrate.length;

  let overflow: React.ReactNode = null;
  if (hidden > 0) {
    if (visibleFlatrate.length === 0 && rentCount > 0 && buyCount === 0) {
      overflow = (
        <PaidOfferChip
          type="rent"
          count={rentCount}
          onClick={onMoreClick}
          ariaLabel={t('movies.watchProviders.alsoRentAria', { count: rentCount, title })}
        />
      );
    } else if (visibleFlatrate.length === 0 && buyCount > 0 && rentCount === 0) {
      overflow = (
        <PaidOfferChip
          type="buy"
          count={buyCount}
          onClick={onMoreClick}
          ariaLabel={t('movies.watchProviders.alsoBuyAria', { count: buyCount, title })}
        />
      );
    } else {
      overflow = (
        <OverflowChip
          count={hidden}
          onClick={onMoreClick}
          ariaLabel={t('movies.watchProviders.alsoAvailableAria', { count: hidden, title })}
        />
      );
    }
  }

  return (
    <span className={styles.dispoRow}>
      {visibleFlatrate.length > 0 && (
        <WatchProviderChips
          providers={visibleFlatrate}
          variant="compact"
          className={styles.dispoChips}
          watchPageUrl={watchPageUrl}
          chipMaxWidth={chipMaxWidth}
          showTypeIcon={false}
        />
      )}
      {overflow}
    </span>
  );
}

export interface MovieRowVoteError {
  message: string;
  onRetry: () => void;
}

export interface MovieCardRowProps extends MovieCardCommonProps {
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
      <AlertTriangle aria-hidden size={16} className={styles.errorIcon} />
      <p className={styles.errorMessage}>{voteError.message}</p>
      <button type="button" className={styles.errorRetry} onClick={voteError.onRetry}>
        <RotateCcw aria-hidden size={13} />
        <span>{t('movies.list.retryVoteAction')}</span>
      </button>
    </li>
  );
}

type MovieCardRowView = MovieCardRowProps & {
  s: ReturnType<typeof useMovieCardState>;
  posterSrc: string | undefined;
  posterSrcSet: string | undefined;
  flatrateProviders: MovieCardRowProps['movie']['watchProviders'];
  rentCount: number;
  buyCount: number;
  releaseDateLabel: string | null;
  excluded: boolean;
  selecting: boolean;
  emptyDispoLabel: string;
  m: MovieCardRowProps['movie'];
};

function MovieCardRowMobile({
  s,
  posterSrc,
  posterSrcSet,
  flatrateProviders,
  rentCount,
  buyCount,
  excluded,
  selecting,
  emptyDispoLabel,
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
  voteError,
  participantCount,
}: Readonly<MovieCardRowView>) {
  return (
    <Fragment>
      <li
        className={clsx(
          styles.mobileRow,
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
        <div className={styles.mobilePosterCol} inert={selecting}>
          <RowPoster src={posterSrc} srcSet={posterSrcSet} eager={!!eager} />
          <WatchlistBadge inWatchlist={!!isInWatchlist} t={t} />
        </div>
        <div className={styles.mobileContent} inert={selecting}>
          <div className={styles.mobileTitleRow}>
            <h3 className={styles.title} title={m.title}>
              {m.title}
            </h3>
            {isWinner ? (
              <span className={styles.winnerBadge}>{t('events.wheel.winnerLabel')}</span>
            ) : null}
          </div>
          <div className={styles.mobileFacts}>
            {m.year ? <span>{m.year}</span> : null}
            {s.runtimeLabel ? <span>{s.runtimeLabel}</span> : null}
            {s.voteLabel ? <span>{s.voteLabel}</span> : null}
            <RowDispo
              flatrateProviders={flatrateProviders}
              rentCount={rentCount}
              buyCount={buyCount}
              watchPageUrl={m.tmdbWatchPageUrl}
              maxVisible={1}
              onMoreClick={() => s.openDetails('dispo')}
              emptyLabel={emptyDispoLabel}
              title={m.title}
              t={t}
            />
          </div>
          <div className={styles.mobileBottomSection}>
            <span className={styles.mobileVoteScore}>
              {s.canAct ? <VoteBar m={m} onVote={onVote} t={t} /> : <VoteReadonly m={m} />}
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
                    alwaysShowCount
                    t={t}
                  />
                ) : (
                  s.othersHint && <p className={styles.mobileSeenHint}>{s.othersHint}</p>
                )}
              </span>
            </div>
          </div>
        </div>
        {s.hasDetails ? (
          <button
            type="button"
            className={styles.disclosure}
            onClick={() => s.openDetails('soiree')}
            aria-label={t('movies.details.toggleShow')}
          >
            <ChevronRight aria-hidden size={16} />
          </button>
        ) : (
          <span className={styles.disclosure} aria-hidden />
        )}
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

function MovieCardRowDesktop({
  s,
  posterSrc,
  posterSrcSet,
  flatrateProviders,
  rentCount,
  buyCount,
  releaseDateLabel,
  excluded,
  selecting,
  emptyDispoLabel,
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
  rank,
  voteError,
  participantCount,
}: Readonly<MovieCardRowView>) {
  return (
    <Fragment>
      <li
        className={clsx(
          styles.row,
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
        <div className={styles.posterCol} inert={selecting}>
          <RowPoster src={posterSrc} srcSet={posterSrcSet} eager={!!eager} />
          <WatchlistBadge inWatchlist={!!isInWatchlist} t={t} />
        </div>
        <div className={styles.titleCol} inert={selecting}>
          <div className={styles.titleRow}>
            <h3 className={styles.title} title={m.title}>
              {m.title}
            </h3>
            <DetailsInfoButton
              hasDetails={s.hasDetails}
              onOpen={() => s.openDetails('soiree')}
              title={m.title}
              t={t}
            />
            {isWinner ? (
              <span className={styles.winnerBadge}>{t('events.wheel.winnerLabel')}</span>
            ) : null}
          </div>
          <div className={styles.metaRow}>
            <ProposerBadge
              avatarId={s.proposerAvatarId}
              pseudo={m.proposerPseudo}
              handle={m.proposerHandle}
              t={t}
            />
          </div>
        </div>
        <span className={styles.cellEnd}>{s.voteLabel}</span>
        <span className={styles.cellEnd}>{s.runtimeLabel}</span>
        <span className={styles.cellEnd}>{releaseDateLabel}</span>
        <div className={styles.dispoCol}>
          <RowDispo
            flatrateProviders={flatrateProviders}
            rentCount={rentCount}
            buyCount={buyCount}
            watchPageUrl={m.tmdbWatchPageUrl}
            maxVisible={2}
            chipMaxWidth="2.75rem"
            onMoreClick={() => s.openDetails('dispo')}
            emptyLabel={emptyDispoLabel}
            title={m.title}
            t={t}
          />
        </div>
        <div className={styles.votesCol} inert={selecting}>
          {s.canAct ? <VoteBar m={m} onVote={onVote} t={t} /> : <VoteReadonly m={m} />}
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
          slotClassName={styles.kebabCol ?? ''}
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

export const MovieCardRow = memo(function MovieCardRow({
  movie: m,
  slug,
  participantId,
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
  isMobile,
  rank,
  voteError,
  participantCount,
}: Readonly<MovieCardRowProps>) {
  const s = useMovieCardState({
    movie: m,
    slug,
    participantId,
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
  const releaseDateLabel = formatReleaseYear(m.releaseDate);
  const excluded = !!m.excludedFromWheel;
  const selecting = !!selection?.active && !excluded;
  const emptyDispoLabel = t('movies.watchProviders.emptyLabel');

  const view: MovieCardRowView = {
    ...({
      movie: m,
      slug,
      participantId,
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
      isMobile,
      rank,
      voteError,
      participantCount,
    } as MovieCardRowProps),
    s,
    posterSrc,
    posterSrcSet,
    flatrateProviders,
    rentCount,
    buyCount,
    releaseDateLabel,
    excluded,
    selecting,
    emptyDispoLabel,
    m,
  };

  if (isMobile) return <MovieCardRowMobile {...view} />;
  return <MovieCardRowDesktop {...view} />;
});

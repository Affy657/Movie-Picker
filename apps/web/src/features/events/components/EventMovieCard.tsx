import { memo } from 'react';
import clsx from 'clsx';
import { Film, Star } from 'lucide-react';
import { MovieCardKebab, WatchlistBadge } from '@/features/movies/components/movieCardParts';
import EventProviderLogos from '@/features/events/components/EventProviderLogos';
import {
  CardNote,
  CardProposerFooter,
  CardSelectionOverlay,
  noteRemoveAction,
  PosterDetailsTrigger,
  ScoreBlock,
  VoteBar,
  VoteCounts,
  VoteErrorNotice,
  WinnerRibbon,
  type MovieVoteError,
  isSelectable,
  useMovieCardState,
  type MovieCardCommonProps,
} from '@/features/events/components/eventMovieCardParts';
import SeenButton from '@/features/events/components/SeenButton';
import AvatarStack from '@/shared/components/AvatarStack';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useNarrowerThan } from '@/shared/hooks/useNarrowerThan';
import type { Translate } from '@/shared/i18n';
import type { MovieData } from '@/shared/types/movie';
import cardPartsStyles from './eventMovieCardParts.module.css';
import styles from './EventMovieCard.module.css';

const VOTE_LABELS_MIN_BAR_WIDTH = 300;

function CardPoster({
  src,
  srcSet,
  eager,
}: Readonly<{ src: string | null | undefined; srcSet?: string; eager: boolean }>) {
  if (!src) {
    return (
      <div className={styles.posterPlaceholder} aria-hidden>
        <Film size={ICON_SIZE.xl} />
      </div>
    );
  }
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes="104px"
      alt=""
      className={styles.poster}
      width={104}
      height={156}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
    />
  );
}

type CardState = ReturnType<typeof useMovieCardState>;

function CardFacts({ m, s, t }: Readonly<{ m: MovieData; s: CardState; t: Translate }>) {
  return (
    <p className={styles.facts}>
      {m.year ? <span>{m.year}</span> : null}
      {s.runtimeLabel ? <span title={t('movies.list.runtimeTitle')}>{s.runtimeLabel}</span> : null}
      {s.voteValue ? (
        <span className={styles.rating} title={t('movies.list.tmdbVoteTitle')}>
          <Star aria-hidden size={ICON_SIZE.xs} className={styles.star} />
          {s.voteValue}
        </span>
      ) : null}
      {m.mediaType === 'tv' ? <span className={styles.tag}>{t('movies.list.tvBadge')}</span> : null}
    </p>
  );
}

function CardSeenPeople({
  m,
  avatarsByPseudo,
  t,
}: Readonly<{ m: MovieData; avatarsByPseudo?: Record<string, string>; t: Translate }>) {
  const seenPeople = (m.seenByPseudos ?? []).map((pseudo) => ({
    key: pseudo,
    pseudo,
    avatarId: avatarsByPseudo?.[pseudo] ?? '',
  }));
  return (
    <>
      {seenPeople.length > 0 ? (
        <AvatarStack
          people={seenPeople}
          max={3}
          size="sm"
          ariaLabel={t('movies.seen.seenByAria', {
            names: seenPeople.map((p) => p.pseudo).join(', '),
          })}
        />
      ) : (
        <span className={styles.nobody}>{t('movies.card.nobody')}</span>
      )}
    </>
  );
}

export interface EventMovieCardProps extends MovieCardCommonProps {
  voteError?: MovieVoteError;
}

export const EventMovieCard = memo(function EventMovieCard({
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
  voteError,
}: Readonly<EventMovieCardProps>) {
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
  const bar = useNarrowerThan<HTMLDivElement>(VOTE_LABELS_MIN_BAR_WIDTH);

  const excluded = !!m.excludedFromWheel;
  const selecting = isSelectable(m, selection) && !excluded;

  return (
    <Card
      as="li"
      padding="none"
      elevation="sm"
      className={clsx(
        styles.card,
        isWinner && styles.cardWinner,
        excluded && cardPartsStyles.excluded,
        selecting && cardPartsStyles.selectable
      )}
    >
      {excluded && <span className="visually-hidden">{t('movies.list.excludedFromWheelSr')}</span>}
      {selecting && selection ? (
        <CardSelectionOverlay movie={m} selection={selection} t={t} />
      ) : null}
      <div className={styles.top} inert={selecting}>
        <div className={styles.posterCol}>
          <CardPoster src={s.posterSrc} srcSet={s.posterSrcSet} eager={eager} />
          <PosterDetailsTrigger
            hasDetails={s.hasDetails}
            onOpen={() => s.openDetails()}
            title={m.title}
            t={t}
          />
          <WatchlistBadge inWatchlist={isInWatchlist} t={t} />
          <WinnerRibbon isWinner={isWinner} winnerRank={winnerRank} t={t} />
        </div>
        <div className={styles.info}>
          <h3 className={styles.title} title={m.title}>
            {m.title}
          </h3>
          <CardFacts m={m} s={s} t={t} />
          <div className={styles.offers}>
            <span className={styles.fieldLabel}>{t('movies.watchProviders.columnLabel')}</span>
            <EventProviderLogos
              providers={m.watchProviders}
              slots={4}
              title={m.title}
              watchPageUrl={m.tmdbWatchPageUrl}
              onOpenDetails={() => s.openDetails()}
            />
          </div>
        </div>
      </div>

      <dl className={styles.fields} inert={selecting}>
        <div className={styles.field}>
          <dt className={styles.fieldLabel}>{t('movies.card.proposedByLabel')}</dt>
          <dd className={styles.fieldValue}>
            <CardProposerFooter s={s} m={m} t={t} />
          </dd>
        </div>
        <div className={styles.field}>
          <dt className={styles.fieldLabel}>{t('movies.list.columnScore')}</dt>
          <dd className={styles.fieldValue}>
            <ScoreBlock m={m} t={t} inline />
          </dd>
        </div>
        <div className={styles.field}>
          <dt className={styles.fieldLabel}>{t('movies.seen.columnLabel')}</dt>
          <dd className={styles.fieldValue}>
            <CardSeenPeople m={m} avatarsByPseudo={participantAvatarsByPseudo} t={t} />
          </dd>
        </div>
      </dl>

      <div className={styles.note} inert={selecting}>
        {voteError && !s.noteEditing ? (
          <VoteErrorNotice voteError={voteError} title={m.title} t={t} />
        ) : (
          <CardNote
            s={s}
            m={m}
            slug={slug}
            participantId={participantId}
            refresh={refresh}
            onActionError={onActionError}
            lines={2}
            t={t}
          />
        )}
      </div>

      <div ref={bar.ref} className={styles.bar} inert={selecting}>
        {s.canVote ? (
          <VoteBar
            m={m}
            onVote={onVote}
            t={t}
            lockedHint={voteLockedHint}
            framed
            showLabels={!bar.narrow}
          />
        ) : (
          <VoteCounts m={m} t={t} />
        )}
        <span className={styles.spacer} />
        {s.canAct ? (
          <SeenButton
            m={m}
            iMarkedSeen={s.iMarkedSeen}
            seenPending={s.seenPending}
            onToggle={() => void s.handleToggleSeen()}
            framed
            t={t}
          />
        ) : null}
        <MovieCardKebab
          movie={m}
          card={s}
          slotClassName={styles.kebabSlot ?? ''}
          remove={s.kebabRemove}
          removeNote={noteRemoveAction(m, s.canRemove, onRemoveNote, t)}
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={onToggleWatchlist}
          onToggleWheelExclusion={onToggleWheelExclusion}
          alwaysVisible
          t={t}
        />
      </div>
    </Card>
  );
});

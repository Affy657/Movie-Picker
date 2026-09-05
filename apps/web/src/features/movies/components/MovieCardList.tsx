import SeenButton from '@/features/movies/components/SeenButton';
import { memo } from 'react';
import clsx from 'clsx';
import { ImageOff } from 'lucide-react';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import {
  MovieCardKebab,
  CardModals,
  CardProposerFooter,
  CardSelectionOverlay,
  DetailsInfoButton,
  MovieNote,
  PaidOfferChip,
  VoteBar,
  WatchlistBadge,
  useMovieCardState,
  type MovieCardCommonProps,
} from '@/features/movies/components/movieCardParts';
import cardPartsStyles from './movieCardParts.module.css';
import styles from './MovieCardList.module.css';

function ListPoster({
  src,
  srcSet,
  eager,
}: Readonly<{ src: string | null | undefined; srcSet?: string; eager: boolean }>) {
  if (!src) {
    return (
      <div className={styles.posterPlaceholder} aria-hidden>
        <ImageOff size={28} />
      </div>
    );
  }
  return (
    <>
      <div
        className={styles.posterBackdrop}
        style={{ backgroundImage: `url("${encodeURI(src)}")` }}
        aria-hidden
      />
      <img
        src={src}
        srcSet={srcSet}
        sizes="(max-width: 479px) 33vw, 200px"
        alt=""
        className={styles.poster}
        width={120}
        height={180}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
      />
    </>
  );
}

export const MovieCardList = memo(function MovieCardList({
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
  participantCount,
}: MovieCardCommonProps) {
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

  const flatrateProviders = s.providers.filter((p) => p.type === 'flatrate');
  const rentCount = s.providers.filter((p) => p.type === 'rent').length;
  const buyCount = s.providers.filter((p) => p.type === 'buy').length;
  const hasRenderableOffers = flatrateProviders.length > 0 || rentCount > 0 || buyCount > 0;

  const excluded = !!m.excludedFromWheel;
  const selecting = !!selection?.active && !excluded;

  return (
    <li
      className={clsx(
        styles.card,
        isWinner && styles.cardWinner,
        excluded && cardPartsStyles.excluded,
        selecting && cardPartsStyles.selectable
      )}
    >
      {excluded && <span className="visually-hidden">{t('movies.list.excludedFromWheelSr')}</span>}
      {selecting && <CardSelectionOverlay movie={m} selection={selection} t={t} />}
      <div className={styles.posterCol} inert={selecting}>
        <ListPoster src={s.posterSrc} srcSet={s.posterSrcSet} eager={eager} />
        {m.mediaType === 'tv' && <span className={styles.tvBadge}>{t('movies.list.tvBadge')}</span>}
        <WatchlistBadge inWatchlist={isInWatchlist} t={t} />
      </div>

      <div className={styles.info} inert={selecting}>
        <MovieCardKebab
          movie={m}
          card={s}
          slotClassName={styles.kebabSlot ?? ''}
          isHost={isHost}
          isInWatchlist={isInWatchlist}
          onRemove={onRemove}
          onToggleWatchlist={onToggleWatchlist}
          onToggleWheelExclusion={onToggleWheelExclusion}
          t={t}
        />
        <div className={styles.titleRow}>
          <h3 className={styles.title} title={m.title}>
            {m.title}
          </h3>
          {isWinner ? (
            <span className={styles.winnerBadge}>{t('events.wheel.winnerLabel')}</span>
          ) : null}
        </div>

        <p className={styles.metaLine}>
          {m.year ? <span>{m.year}</span> : null}
          {s.runtimeLabel ? (
            <span title={t('movies.list.runtimeTitle')}>{s.runtimeLabel}</span>
          ) : null}
          {s.voteLabel ? <span title={t('movies.list.tmdbVoteTitle')}>{s.voteLabel}</span> : null}
        </p>

        {hasRenderableOffers ? (
          <div className={styles.offersRow}>
            {flatrateProviders.length > 0 && (
              <WatchProviderChips
                providers={flatrateProviders}
                variant="compact"
                className={styles.cardProviders}
                watchPageUrl={m.tmdbWatchPageUrl}
                maxVisible={3}
                onMoreClick={() => s.openDetails('dispo')}
              />
            )}
            {rentCount > 0 && (
              <PaidOfferChip
                type="rent"
                count={rentCount}
                onClick={() => s.openDetails('dispo')}
                ariaLabel={t('movies.watchProviders.alsoRentAria', {
                  count: rentCount,
                  title: m.title,
                })}
              />
            )}
            {buyCount > 0 && (
              <PaidOfferChip
                type="buy"
                count={buyCount}
                onClick={() => s.openDetails('dispo')}
                ariaLabel={t('movies.watchProviders.alsoBuyAria', {
                  count: buyCount,
                  title: m.title,
                })}
              />
            )}
          </div>
        ) : (
          <p className={styles.providersEmpty}>{t('movies.watchProviders.emptyLabel')}</p>
        )}

        <div className={styles.bottomSection}>
          {s.canAct && (
            <div className={styles.actions}>
              <VoteBar m={m} onVote={onVote} t={t} />
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
            </div>
          )}

          {!s.canAct && s.othersHint && <p className={styles.seenHint}>{s.othersHint}</p>}

          {(m.pitchNote || s.noteEditing) && (
            <MovieNote
              movieId={m.id}
              slug={slug}
              pitchNote={m.pitchNote}
              isMine={s.isMine}
              participantId={participantId}
              editing={s.noteEditing}
              onEditingChange={s.setNoteEditing}
              refresh={refresh}
              onActionError={onActionError}
              t={t}
            />
          )}

          <div className={styles.proposerRow}>
            <CardProposerFooter s={s} m={m} t={t} />
            <DetailsInfoButton
              hasDetails={s.hasDetails}
              onOpen={() => s.openDetails('soiree')}
              title={m.title}
              t={t}
            />
          </div>
        </div>
      </div>

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
  );
});

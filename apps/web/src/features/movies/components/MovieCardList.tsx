import { memo } from 'react';
import clsx from 'clsx';
import WatchProviderChips, { ModeIcon } from '@/features/movies/components/WatchProviderChips';
import {
  CardKebab,
  CardModals,
  CardProposerFooter,
  CardSelectionOverlay,
  MovieNote,
  SeenButton,
  VoteBar,
  useMovieCardState,
  type MovieCardCommonProps,
} from '@/features/movies/components/movieCardParts';
import cardPartsStyles from './movieCardParts.module.css';
import styles from './MovieCardList.module.css';

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
  selection,
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

  const selecting = !!selection?.active;

  return (
    <li className={clsx(styles.card, selecting && cardPartsStyles.selectable)}>
      {selecting && <CardSelectionOverlay movie={m} selection={selection} t={t} />}
      <div className={styles.posterCol} inert={selecting}>
        {s.posterSrc ? (
          <>
            <div
              className={styles.posterBackdrop}
              style={{ backgroundImage: `url("${encodeURI(s.posterSrc)}")` }}
              aria-hidden
            />
            <img
              src={s.posterSrc}
              srcSet={s.posterSrcSet}
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
        ) : (
          <div className={styles.posterPlaceholder} aria-hidden>
            {t('movies.search.posterPlaceholder')}
          </div>
        )}
        {m.mediaType === 'tv' && <span className={styles.tvBadge}>{t('movies.list.tvBadge')}</span>}
      </div>

      <div className={styles.info} inert={selecting}>
        {(s.hasDetails || s.canRemove || !!onToggleWatchlist) && (
          <div className={styles.kebabSlot}>
            <CardKebab
              title={m.title}
              year={m.year}
              tmdbId={m.tmdbId}
              mediaType={m.mediaType}
              isMine={s.isMine}
              isHost={isHost}
              canRemove={s.canRemove}
              onRemove={() => void onRemove(m.id)}
              inWatchlist={isInWatchlist}
              onToggleWatchlist={onToggleWatchlist ? () => onToggleWatchlist(m) : undefined}
              t={t}
            />
          </div>
        )}
        <h3 className={styles.title} title={m.title}>
          {m.title}
        </h3>

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
                onMoreClick={() => s.setProvidersOpen(true)}
              />
            )}
            {rentCount > 0 && (
              <button
                type="button"
                className={styles.paidChip}
                onClick={() => s.setProvidersOpen(true)}
                aria-label={t('movies.watchProviders.alsoRentAria', {
                  count: rentCount,
                  title: m.title,
                })}
              >
                <ModeIcon type="rent" size={13} />
                {rentCount}
              </button>
            )}
            {buyCount > 0 && (
              <button
                type="button"
                className={styles.paidChip}
                onClick={() => s.setProvidersOpen(true)}
                aria-label={t('movies.watchProviders.alsoBuyAria', {
                  count: buyCount,
                  title: m.title,
                })}
              >
                <ModeIcon type="buy" size={13} />
                {buyCount}
              </button>
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
          </div>
        </div>
      </div>

      <CardModals s={s} m={m} />
    </li>
  );
});

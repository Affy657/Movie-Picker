import { memo } from 'react';
import { ChevronDown, MessageSquarePlus } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import MovieDetailsModal from '@/features/movies/components/MovieDetailsModal';
import WatchProviderChips, { ModeIcon } from '@/features/movies/components/WatchProviderChips';
import WatchProvidersModal from '@/features/movies/components/WatchProvidersModal';
import {
  CardKebab,
  MovieNote,
  SeenButton,
  VoteBar,
  useMovieCardState,
  type MovieCardCommonProps,
} from '@/features/movies/components/movieCardParts';
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
  eager = false,
}: MovieCardCommonProps) {
  const s = useMovieCardState({
    movie: m,
    slug,
    participantId,
    participantPseudo,
    isFinished,
    isHost,
    participantAvatars,
    refresh,
    onActionError,
    t,
  });

  const flatrateProviders = s.providers.filter((p) => p.type === 'flatrate');
  const rentCount = s.providers.filter((p) => p.type === 'rent').length;
  const buyCount = s.providers.filter((p) => p.type === 'buy').length;
  const hasRenderableOffers = flatrateProviders.length > 0 || rentCount > 0 || buyCount > 0;

  return (
    <li className={styles.card}>
      <div className={styles.posterCol}>
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

      <div className={styles.info}>
        {(s.hasDetails || s.canRemove) && (
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
            <span className={styles.proposer}>
              <Avatar avatarId={s.proposerAvatarId} pseudo={m.proposerPseudo} size="xs" />
              <span className={styles.proposerName}>{m.proposerPseudo}</span>
              {s.showAddNote && (
                <button
                  type="button"
                  className={styles.addNote}
                  onClick={() => s.setNoteEditing(true)}
                  aria-label={t('movies.pitchNote.addButton')}
                  title={t('movies.pitchNote.addButton')}
                >
                  <MessageSquarePlus aria-hidden size={15} />
                </button>
              )}
            </span>
            {s.hasDetails && (
              <button
                type="button"
                className={styles.detailsToggle}
                aria-haspopup="dialog"
                aria-expanded={s.detailsOpen}
                onClick={() => s.setDetailsOpen(true)}
              >
                <span>{t('movies.details.toggleShow')}</span>
                <ChevronDown aria-hidden size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {s.hasDetails && (
        <MovieDetailsModal
          open={s.detailsOpen}
          movieTitle={m.title}
          tmdbId={m.tmdbId}
          mediaType={m.mediaType}
          onClose={() => s.setDetailsOpen(false)}
        />
      )}

      {s.providers.length > 0 && (
        <WatchProvidersModal
          open={s.providersOpen}
          movieTitle={m.title}
          providers={s.providers}
          watchPageUrl={m.tmdbWatchPageUrl}
          onClose={() => s.setProvidersOpen(false)}
        />
      )}
    </li>
  );
});

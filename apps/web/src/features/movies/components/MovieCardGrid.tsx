import { memo } from 'react';
import clsx from 'clsx';
import { ModeIcon, TYPE_ORDER } from '@/features/movies/components/WatchProviderChips';
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
import styles from './MovieCardGrid.module.css';

const KNOWN_PROVIDER_TYPES = new Set<string>(TYPE_ORDER);

export const MovieCardGrid = memo(function MovieCardGrid({
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

  const providerGroups = [
    ...TYPE_ORDER.map((type) => ({
      type: type as string,
      count: s.providers.filter((p) => p.type === type).length,
    })).filter((g) => g.count > 0),
    { type: 'other', count: s.providers.filter((p) => !KNOWN_PROVIDER_TYPES.has(p.type)).length },
  ].filter((g) => g.count > 0);

  const excluded = !!m.excludedFromWheel;
  const selecting = !!selection?.active && !excluded;

  return (
    <li
      className={clsx(
        styles.card,
        excluded && cardPartsStyles.excluded,
        selecting && cardPartsStyles.selectable
      )}
    >
      {excluded && <span className="visually-hidden">{t('movies.list.excludedFromWheelSr')}</span>}
      {selecting && <CardSelectionOverlay movie={m} selection={selection} t={t} />}
      <div className={styles.posterRegion} inert={selecting}>
        {s.posterSrc ? (
          <img
            src={s.posterSrc}
            srcSet={s.posterSrcSet}
            sizes="(max-width: 479px) 100vw, 220px"
            alt=""
            className={styles.poster}
            width={120}
            height={180}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'auto'}
            decoding="async"
          />
        ) : (
          <div className={styles.posterPlaceholder} aria-hidden>
            {t('movies.search.posterPlaceholder')}
          </div>
        )}

        {m.mediaType === 'tv' && <span className={styles.tvBadge}>{t('movies.list.tvBadge')}</span>}

        {(s.hasDetails || s.canRemove || !!onToggleWatchlist || !!onToggleWheelExclusion) && (
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
              wheelExclusion={
                onToggleWheelExclusion
                  ? { excluded, onToggle: () => onToggleWheelExclusion(m) }
                  : undefined
              }
              t={t}
            />
          </div>
        )}

        <div className={styles.panel}>
          <div className={styles.titleBlock}>
            <h3 className={styles.title}>{m.title}</h3>
            <p className={styles.meta}>
              {m.year ? <span>{m.year}</span> : null}
              {s.runtimeLabel ? (
                <span title={t('movies.list.runtimeTitle')}>{s.runtimeLabel}</span>
              ) : null}
              {s.voteLabel ? (
                <span title={t('movies.list.tmdbVoteTitle')}>{s.voteLabel}</span>
              ) : null}
              {providerGroups.length > 0 && (
                <span>
                  <button
                    type="button"
                    className={styles.metaProviders}
                    onClick={() => s.setProvidersOpen(true)}
                    aria-label={t('movies.watchProviders.openModalAria', { title: m.title })}
                  >
                    {providerGroups.map((g) => (
                      <span key={g.type} className={styles.metaProvGroup}>
                        <ModeIcon type={g.type} size={12} />
                        <span>{g.count}</span>
                      </span>
                    ))}
                  </button>
                </span>
              )}
            </p>
          </div>

          {s.canAct && (
            <div className={styles.actionRow}>
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

          {!s.canAct && s.othersHint && <p className={styles.seenHintText}>{s.othersHint}</p>}

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

          <div className={styles.footRow}>
            <CardProposerFooter s={s} m={m} t={t} />
          </div>
        </div>
      </div>

      <CardModals s={s} m={m} />
    </li>
  );
});

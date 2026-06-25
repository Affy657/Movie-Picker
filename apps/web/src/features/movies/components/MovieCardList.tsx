import { memo } from 'react';
import { ChevronDown, ChevronUp, MessageSquarePlus } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import { MovieDetailsContent } from '@/features/movies/components/MovieDetailsPanel';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
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

  return (
    <li className={styles.card}>
      <div className={styles.posterCol}>
        {s.posterSrc ? (
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
        ) : (
          <div className={styles.posterPlaceholder} aria-hidden>
            {t('movies.search.posterPlaceholder')}
          </div>
        )}
        {m.mediaType === 'tv' && <span className={styles.tvBadge}>{t('movies.list.tvBadge')}</span>}
      </div>

      <div className={styles.info}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{m.title}</h3>
          {(s.hasDetails || s.canRemove) && (
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
          )}
        </div>

        <p className={styles.metaLine}>
          {m.year ? <span>{m.year}</span> : null}
          {s.runtimeLabel ? (
            <span title={t('movies.list.runtimeTitle')}>{s.runtimeLabel}</span>
          ) : null}
          {s.voteLabel ? (
            <span title={t('movies.list.tmdbVoteTitle')}>{s.voteLabel}</span>
          ) : null}
        </p>

        {s.providers.length > 0 ? (
          <WatchProviderChips
            providers={s.providers}
            variant="compact"
            className={styles.cardProviders}
            watchPageUrl={m.tmdbWatchPageUrl}
            maxVisible={3}
          />
        ) : (
          <p className={styles.providersEmpty}>{t('movies.watchProviders.emptyLabel')}</p>
        )}

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
            <Avatar avatarId={s.proposerAvatarId} size="xs" />
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
              aria-expanded={s.detailsOpen}
              aria-controls={s.detailsPanelId}
              onClick={() => s.setDetailsOpen((v) => !v)}
            >
              <span>
                {s.detailsOpen ? t('movies.details.toggleHide') : t('movies.details.toggleShow')}
              </span>
              {s.detailsOpen ? (
                <ChevronUp aria-hidden size={14} />
              ) : (
                <ChevronDown aria-hidden size={14} />
              )}
            </button>
          )}
        </div>
      </div>

      {s.hasDetails && s.detailsOpen && (
        <div className={styles.detailsPanel}>
          <MovieDetailsContent
            tmdbId={m.tmdbId}
            mediaType={m.mediaType}
            open={s.detailsOpen}
            panelId={s.detailsPanelId}
          />
        </div>
      )}
    </li>
  );
});

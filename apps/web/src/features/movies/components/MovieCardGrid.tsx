import { memo } from 'react';
import { ChevronDown, MessageSquarePlus } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import MovieDetailsModal from '@/features/movies/components/MovieDetailsModal';
import { ModeIcon, TYPE_ORDER } from '@/features/movies/components/WatchProviderChips';
import WatchProvidersModal from '@/features/movies/components/WatchProvidersModal';
import {
  CardKebab,
  MovieNote,
  SeenButton,
  VoteBar,
  useMovieCardState,
  type MovieCardCommonProps,
} from '@/features/movies/components/movieCardParts';
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

  const providerGroups = [
    ...TYPE_ORDER.map((type) => ({
      type: type as string,
      count: s.providers.filter((p) => p.type === type).length,
    })).filter((g) => g.count > 0),
    { type: 'other', count: s.providers.filter((p) => !KNOWN_PROVIDER_TYPES.has(p.type)).length },
  ].filter((g) => g.count > 0);

  return (
    <li className={styles.card}>
      <div className={styles.posterRegion}>
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
                        <ModeIcon type={g.type} size={11} />
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

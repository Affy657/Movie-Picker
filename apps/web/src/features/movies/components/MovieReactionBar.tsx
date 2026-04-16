import clsx from 'clsx';
import { useMutation } from '@tanstack/react-query';
import { addMovieReaction, removeMovieReaction } from '@/features/movies/api/moviesApi';
import { getErrorMessage } from '@/shared/api/apiError';
import styles from './MovieReactionBar.module.css';
import {
  REACTION_CATALOG_IDS,
  REACTION_ICONS,
  REACTION_LABELS,
  type ReactionCatalogId,
} from '@/shared/constants/reactionCatalog';
import type { MovieReactionAggregate } from '@/shared/types/movie';

type InnerProps = {
  slug: string;
  movieId: string;
  participantId: string | null;
  participantPseudo: string | null;
  reactions: MovieReactionAggregate[] | undefined;
  ids: readonly ReactionCatalogId[];
  readOnly: boolean;
  onRefresh: () => void;
  onError: (message: string) => void;
};

type Props = Omit<InnerProps, 'ids'> & {
  allowedReactionIds: readonly string[];
};

function aggregateFor(
  reactions: MovieReactionAggregate[] | undefined,
  id: string
): MovieReactionAggregate | undefined {
  return reactions?.find((r) => r.reactionId === id);
}

function MovieReactionBarInner({
  slug,
  movieId,
  participantId,
  participantPseudo,
  reactions,
  ids,
  readOnly,
  onRefresh,
  onError,
}: InnerProps) {
  const mutation = useMutation({
    mutationFn: async (vars: { reactionId: string; action: 'add' | 'remove' }) => {
      if (!participantId) throw new Error('Participant requis');
      if (vars.action === 'add') {
        await addMovieReaction(slug, movieId, participantId, vars.reactionId);
      } else {
        await removeMovieReaction(slug, movieId, participantId, vars.reactionId);
      }
    },
    onSuccess: () => onRefresh(),
    onError: (e) => onError(getErrorMessage(e, 'Réaction impossible')),
  });

  const busyHere = mutation.isPending;

  if (readOnly || !participantId) {
    const withActivity = ids.filter((id) => (aggregateFor(reactions, id)?.count ?? 0) > 0);
    if (withActivity.length === 0) return null;

    return (
      <div className={clsx(styles.reactions, styles.readOnly)} aria-label="Réactions">
        {withActivity.map((reactionId) => {
          const agg = aggregateFor(reactions, reactionId);
          const count = agg?.count ?? 0;
          const label = REACTION_LABELS[reactionId];
          const Icon = REACTION_ICONS[reactionId];
          return (
            <span key={reactionId} className={clsx(styles.chip, styles.chipReadonly)} title={label}>
              <Icon aria-hidden size={16} />
              <span className={styles.chipText}>{label}</span>
              <span className={styles.chipCount}>{count}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.reactions} role="group" aria-label="Réactions">
      {ids.map((reactionId) => {
        const agg = aggregateFor(reactions, reactionId);
        const count = agg?.count ?? 0;
        const pseudos = agg?.pseudos ?? [];
        const isMine = !!participantPseudo && pseudos.includes(participantPseudo);
        const label = REACTION_LABELS[reactionId];
        const Icon = REACTION_ICONS[reactionId];

        return (
          <button
            key={reactionId}
            type="button"
            className={clsx('btn btn-sm', styles.chip, isMine && styles.chipActive)}
            disabled={busyHere}
            aria-pressed={isMine}
            title={isMine ? `${label} — cliquer pour retirer` : `${label} — ajouter`}
            onClick={() =>
              mutation.mutate({
                reactionId,
                action: isMine ? 'remove' : 'add',
              })
            }
          >
            <Icon aria-hidden size={16} />
            <span className={styles.chipText}>{label}</span>
            {count > 0 ? (
              <span
                className={styles.chipCount}
                aria-label={`${count} participant${count > 1 ? 's' : ''}`}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default function MovieReactionBar(props: Props) {
  const ids = REACTION_CATALOG_IDS.filter((id) => props.allowedReactionIds.includes(id));
  if (ids.length === 0) return null;

  return <MovieReactionBarInner {...props} ids={ids} />;
}

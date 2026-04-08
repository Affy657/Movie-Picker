import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '../api/client';
import { getErrorMessage } from '../api/apiError';
import {
  REACTION_CATALOG_IDS,
  REACTION_EMOJI,
  REACTION_LABELS,
  type ReactionCatalogId,
} from '../constants/reactionCatalog';
import type { MovieReactionAggregate } from '../types/event';

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
        await fetchApi(`/events/${slug}/movies/${movieId}/reactions`, {
          method: 'POST',
          body: JSON.stringify({
            participantId,
            reactionId: vars.reactionId,
          }),
        });
      } else {
        await fetchApi(
          `/events/${slug}/movies/${movieId}/reactions/${encodeURIComponent(vars.reactionId)}`,
          {
            method: 'DELETE',
            body: JSON.stringify({ participantId }),
          }
        );
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
      <div className="movie-reactions movie-reactions-readonly" aria-label="Réactions">
        {withActivity.map((reactionId) => {
          const agg = aggregateFor(reactions, reactionId);
          const count = agg?.count ?? 0;
          const label = REACTION_LABELS[reactionId];
          const emoji = REACTION_EMOJI[reactionId];
          return (
            <span key={reactionId} className="reaction-chip reaction-chip-readonly" title={label}>
              <span aria-hidden>{emoji}</span>
              <span className="reaction-chip-text">{label}</span>
              <span className="reaction-chip-count">{count}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="movie-reactions" role="group" aria-label="Réactions">
      {ids.map((reactionId) => {
        const agg = aggregateFor(reactions, reactionId);
        const count = agg?.count ?? 0;
        const pseudos = agg?.pseudos ?? [];
        const isMine = !!participantPseudo && pseudos.includes(participantPseudo);
        const label = REACTION_LABELS[reactionId];
        const emoji = REACTION_EMOJI[reactionId];

        return (
          <button
            key={reactionId}
            type="button"
            className={`btn btn-sm reaction-chip ${isMine ? 'reaction-chip-active' : ''}`}
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
            <span aria-hidden>{emoji}</span>
            <span className="reaction-chip-text">{label}</span>
            {count > 0 ? (
              <span
                className="reaction-chip-count"
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

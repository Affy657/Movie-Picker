import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router';
import { JOIN_QUERY_PARAM } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useJoinEvent } from '@/features/events/hooks/useJoinEvent';
import type { EventData } from '@/features/events/types';
import { getErrorMessage } from '@/shared/api/apiError';
import { useTranslation } from '@/shared/i18n';

type ParticipantRef = { participantId: string; pseudo: string };

export type JoinIntentStep = 'wait' | 'drop' | 'join';

type JoinIntentState = {
  slug: string | undefined;
  event: EventData | null;
  authLoading: boolean;
  signedIn: boolean;
  alreadyParticipant: boolean;
  eventSettled: boolean;
  offline: boolean;
};

function isFull(event: EventData): boolean {
  const cap = event.config?.maxParticipants;
  const count = event.participantCount ?? event.participants?.length ?? 0;
  return typeof cap === 'number' && cap > 0 && count >= cap;
}

export function joinIntentStep(state: JoinIntentState): JoinIntentStep {
  const { event } = state;
  if (state.authLoading || !state.eventSettled || state.offline) return 'wait';
  if (!state.slug || event?.slug !== state.slug) return 'wait';
  if (!state.signedIn || state.alreadyParticipant || event.myParticipant) return 'drop';
  if (event.isFinished || event.viewerRemoved || isFull(event)) return 'drop';
  return 'join';
}

export function useJoinIntent({
  slug,
  event,
  participant,
  setParticipant,
  eventSettled,
  offline,
  onJoined,
  onError,
}: Readonly<{
  slug: string | undefined;
  event: EventData | null;
  participant: ParticipantRef | null;
  setParticipant: Dispatch<SetStateAction<ParticipantRef | null>>;
  eventSettled: boolean;
  offline: boolean;
  onJoined: () => void;
  onError: (message: string) => void;
}>): void {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.has(JOIN_QUERY_PARAM);
  const { user, isLoading: authLoading } = useAuth();
  const join = useJoinEvent(slug ?? '');
  const startedRef = useRef(false);
  const step = requested
    ? joinIntentStep({
        slug,
        event,
        authLoading,
        signedIn: !!user,
        alreadyParticipant: !!participant,
        eventSettled,
        offline,
      })
    : 'wait';

  useEffect(() => {
    if (step === 'wait') return;
    const dropIntent = () =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete(JOIN_QUERY_PARAM);
          return next;
        },
        { replace: true }
      );
    if (step === 'drop') {
      dropIntent();
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    dropIntent();
    join()
      .then((joined) => {
        setParticipant({ participantId: joined.participantId, pseudo: joined.pseudo });
        if (joined.isNew) onJoined();
      })
      .catch((error: unknown) => onError(getErrorMessage(error, t('events.join.fallbackError'))));
  }, [step, join, setParticipant, onJoined, onError, setSearchParams, t]);
}

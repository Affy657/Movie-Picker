import type { useEventWheel } from '@/features/events/hooks/useEventWheel';

export type ParticipantRef = { participantId: string; pseudo: string };

export type ShareTab = 'link' | 'friends';

export type MoviesViewMode = 'grid' | 'list';

export type WheelApi = ReturnType<typeof useEventWheel>;

export type ConfirmState =
  | { kind: 'remove'; participantId: string; pseudo: string }
  | { kind: 'leave' }
  | { kind: 'resetWheel' }
  | { kind: 'removeMovie'; movieId: string; movieTitle: string; voteCount: number }
  | { kind: 'closeWithoutMovie' }
  | null;

export type ConfirmBusyByKind = Record<NonNullable<ConfirmState>['kind'], boolean>;

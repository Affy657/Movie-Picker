import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { useEventWheel } from '@/features/events/hooks/useEventWheel';
import type { MovieCardSelection } from '@/features/events/components/eventMovieCardParts';
import type { ParticipantsOutcome } from '@/features/events/components/EventParticipantsList';
import type { MovieData } from '@/shared/types/movie';

export type ParticipantRef = { participantId: string; pseudo: string };

export type ShareTab = 'link' | 'friends';

export type RecapShare = { winners: MovieData[] };

export type MoviesViewMode = 'grid' | 'list';

export type WheelApi = ReturnType<typeof useEventWheel>;

export type ConfirmState =
  | { kind: 'remove'; participantId: string; pseudo: string }
  | { kind: 'leave' }
  | { kind: 'resetWheel' }
  | { kind: 'removeMovie'; movieId: string; movieTitle: string; voteCount: number }
  | { kind: 'removeNote'; movieId: string; movieTitle: string }
  | { kind: 'closeWithoutMovie' }
  | { kind: 'finishNight' }
  | null;

export type ConfirmBusyByKind = Record<NonNullable<ConfirmState>['kind'], boolean>;

export type ShareOverlay = {
  open: boolean;
  initialTab: ShareTab;
  url: string;
  recap: RecapShare | null;
  onOpen: (tab?: ShareTab) => void;
  onClose: () => void;
};

export type SettingsOverlay = {
  open: boolean;
  canConfigure: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export type ParticipantsToggle = {
  count: number;
  onOpen: () => void;
};

export type AddMovieEntry = {
  canAdd: boolean;
  onOpen: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export type EventDateLabels = {
  dateFormatted: string;
  timeFormatted: string;
  dateLabel: string;
};

export type EventCounts = {
  participants: number;
  movies: number;
};

export type JoinGate = {
  needsJoin: boolean;
  isFull: boolean;
  maxParticipants: number | null;
  setParticipant: Dispatch<SetStateAction<ParticipantRef | null>>;
};

export type ParticipantsPanelState = {
  open: boolean;
  onClose: () => void;
  pendingRemovalId: string | null;
  removePending: boolean;
  canShowLeave: boolean;
  canRemove: boolean;
  isConnectedSelf: boolean;
  onRemove: (participantId: string, pseudo: string) => void;
  pendingCoHostId: string | null;
  coHostError: string | null;
  onToggleCoHost: (participantId: string, coHost: boolean) => void;
  pendingLetBackInId: string | null;
  letBackInError: string | null;
  outcome: ParticipantsOutcome | null;
  onLetBackIn: (userId: string, name: string) => void;
  onInviteFriends: () => void;
  onLeave: () => void;
  onlineIds?: ReadonlySet<string>;
  proposingIds?: ReadonlySet<string>;
};

export type MoviesSectionState = {
  offline?: boolean;
  ref: RefObject<HTMLDivElement | null>;
  viewMode: MoviesViewMode;
  titled: boolean;
  onViewModeChange: (mode: MoviesViewMode) => void;
  selection: MovieCardSelection | undefined;
  addMovieOpen: boolean;
  onAddMovieOpenChange: (open: boolean) => void;
  addMovieTriggerRef: RefObject<HTMLButtonElement | null>;
  isFull: boolean;
  wheelLocked: boolean;
  onRequestRemove: (movie: MovieData) => void;
  onRequestRemoveNote: (movie: MovieData) => void;
};

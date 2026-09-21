import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { useEventWheel } from '@/features/events/hooks/useEventWheel';
import type { MovieCardSelection } from '@/features/movies/components/movieCardParts';
import type { MovieData } from '@/shared/types/movie';

export type ParticipantRef = { participantId: string; pseudo: string };

export type ShareTab = 'link' | 'friends';

export type RecapShare = { movie: MovieData | null };

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
  open: boolean;
  count: number;
  onToggle: () => void;
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
  voters: number;
};

export type JoinGate = {
  needsJoin: boolean;
  isFull: boolean;
  maxParticipants: number | null;
  setParticipant: Dispatch<SetStateAction<ParticipantRef | null>>;
};

export type ParticipantsPanelState = {
  open: boolean;
  ref: RefObject<HTMLDivElement | null>;
  pendingRemovalId: string | null;
  removePending: boolean;
  canShowLeave: boolean;
  isConnectedSelf: boolean;
  onRemove: (participantId: string, pseudo: string) => void;
  onInviteFriends: () => void;
  onLeave: () => void;
};

export type MoviesSectionState = {
  ref: RefObject<HTMLDivElement | null>;
  viewMode: MoviesViewMode;
  selection: MovieCardSelection | undefined;
  addMovieOpen: boolean;
  onAddMovieOpenChange: (open: boolean) => void;
  addMovieTriggerRef: RefObject<HTMLButtonElement | null>;
  isFull: boolean;
  onRequestRemove: (movie: MovieData) => void;
};

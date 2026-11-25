import type { MovieData } from '@/shared/types/movie';
import { getParticipantId } from '@/shared/utils/movieParticipant';

export interface NightState {
  isFinished: boolean;
  isHost: boolean;
  wheelLocked: boolean;
}

export interface NightViewer {
  participantId: string | null;
  pseudo: string | null;
}

export interface NightMovieRules {
  isMine: boolean;
  canAct: boolean;
  canRemove: boolean;
  canEditNote: boolean;
  canToggleWheel: boolean;
  iMarkedSeen: boolean;
}

export function isWheelLocked(
  winnerIds: readonly string[],
  locallyDrawnIds: readonly string[] = []
): boolean {
  return winnerIds.length > 0 || locallyDrawnIds.length > 0;
}

export function isMine(movie: MovieData, viewer: NightViewer): boolean {
  return !!viewer.participantId && getParticipantId(movie) === viewer.participantId;
}

export function canAct(night: NightState, viewer: NightViewer): boolean {
  return !night.isFinished && !!viewer.participantId;
}

export function canRemove(movie: MovieData, night: NightState, viewer: NightViewer): boolean {
  return !night.isFinished && !night.wheelLocked && (night.isHost || isMine(movie, viewer));
}

export function canEditNote(movie: MovieData, night: NightState, viewer: NightViewer): boolean {
  return canAct(night, viewer) && !night.wheelLocked && isMine(movie, viewer);
}

export function isNightHost(event: { isHost?: boolean } | null | undefined): boolean {
  return event?.isHost === true;
}

export function canToggleWheel(night: NightState): boolean {
  return night.isHost && !night.isFinished;
}

export function iMarkedSeen(movie: MovieData, viewer: NightViewer): boolean {
  return !!viewer.pseudo && (movie.seenByPseudos ?? []).includes(viewer.pseudo);
}

export function nightMovieRules(
  movie: MovieData,
  night: NightState,
  viewer: NightViewer
): NightMovieRules {
  return {
    isMine: isMine(movie, viewer),
    canAct: canAct(night, viewer),
    canRemove: canRemove(movie, night, viewer),
    canEditNote: canEditNote(movie, night, viewer),
    canToggleWheel: canToggleWheel(night),
    iMarkedSeen: iMarkedSeen(movie, viewer),
  };
}

export function wheelExclusionErrorKey(
  excluded: boolean
): 'movies.list.excludeFromWheelError' | 'movies.list.includeInWheelError' {
  return excluded ? 'movies.list.excludeFromWheelError' : 'movies.list.includeInWheelError';
}

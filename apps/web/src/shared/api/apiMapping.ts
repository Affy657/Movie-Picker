/**
 * Mapping layer between raw MongoDB-style API responses (_id, terminé)
 * and clean domain types (id, isFinished).
 *
 * This isolates the front from the persistence format (Option B of the refactoring plan § 12.9).
 * When the API is updated to return clean field names, remove this module.
 */

import type { EventData } from '@/shared/types/event';
import type { MovieData, ParticipantData } from '@/shared/types/movie';

type RawMovieData = Omit<MovieData, 'id' | 'participantId'> & {
  _id: string;
  participantId: string | { _id: string; pseudo: string };
};

type RawParticipantData = Omit<ParticipantData, 'id'> & { _id: string };

type RawEventData = Omit<EventData, 'id' | 'isFinished' | 'myParticipant' | 'winnerMovie'> & {
  _id: string;
  terminé?: boolean;
  myParticipant?: { _id: string; pseudo: string } | null;
  winnerMovie?: RawMovieData | null;
};

export function mapMovieData(raw: RawMovieData): MovieData {
  const { _id, participantId, ...rest } = raw;
  const pid =
    typeof participantId === 'object' && participantId !== null && '_id' in participantId
      ? { id: participantId._id, pseudo: participantId.pseudo }
      : participantId;
  return { ...rest, id: _id, participantId: pid };
}

export function mapParticipantData(raw: RawParticipantData): ParticipantData {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export function mapEventData(raw: RawEventData): EventData {
  const { _id, terminé, myParticipant, winnerMovie, ...rest } = raw;
  return {
    ...rest,
    id: _id,
    isFinished: terminé ?? false,
    myParticipant: myParticipant
      ? { id: myParticipant._id, pseudo: myParticipant.pseudo }
      : myParticipant,
    winnerMovie: winnerMovie ? mapMovieData(winnerMovie) : winnerMovie,
  };
}

export type { RawEventData, RawMovieData, RawParticipantData };

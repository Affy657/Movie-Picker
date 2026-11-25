import type { EventData, EventParticipantSummary } from '@/shared/types/event';
import type { MovieData, ParticipantData } from '@/shared/types/movie';

type RawMovieData = Omit<MovieData, 'id' | 'participantId' | 'pendingVote'> & {
  _id: string;
  participantId: string;
};

type RawParticipantData = Omit<ParticipantData, 'id'> & { _id: string };

type RawEventParticipantSummary = Omit<EventParticipantSummary, 'id'> & { _id: string };

type RawEventData = Omit<EventData, 'id' | 'isFinished' | 'myParticipant' | 'participants'> & {
  _id: string;
  isFinished?: boolean;
  myParticipant?: { _id: string; pseudo: string } | null;
  participantCount?: number;
  movieCount?: number;
  participants?: RawEventParticipantSummary[];
};

export function mapMovieData(raw: RawMovieData): MovieData {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export function mapParticipantData(raw: RawParticipantData): ParticipantData {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id };
}

export function mapEventData(raw: RawEventData): EventData {
  const { _id, isFinished, myParticipant, winners, participants, ...rest } = raw;
  const mappedParticipants: EventParticipantSummary[] | undefined = participants
    ? participants.map((p) => ({
        id: p._id,
        pseudo: p.pseudo,
        isCreator: p.isCreator ?? false,
        isCoHost: p.isCoHost ?? false,
        avatarId: p.avatarId,
        handle: p.handle ?? null,
        accentColor: p.accentColor ?? null,
      }))
    : undefined;
  return {
    ...rest,
    id: _id,
    isFinished: isFinished ?? false,
    myParticipant: myParticipant
      ? { id: myParticipant._id, pseudo: myParticipant.pseudo }
      : myParticipant,
    winners: winners ?? [],
    participants: mappedParticipants,
  };
}

export type { RawEventData, RawMovieData, RawParticipantData };

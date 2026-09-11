import type { EventData, EventParticipantSummary, EventWinnerData } from '@/shared/types/event';
import type { MovieData, ParticipantData } from '@/shared/types/movie';

type RawMovieData = Omit<MovieData, 'id' | 'participantId'> & {
  _id: string;
  participantId: string | { _id: string; pseudo: string };
};

type RawParticipantData = Omit<ParticipantData, 'id'> & { _id: string };

type RawEventParticipantSummary = {
  _id: string;
  pseudo: string;
  isCreator?: boolean;
  avatarId?: string;
  handle?: string | null;
};

type RawEventWinner = Omit<EventWinnerData, 'movie'> & { movie?: RawMovieData | null };

type RawEventData = Omit<
  EventData,
  'id' | 'isFinished' | 'myParticipant' | 'winners' | 'participants'
> & {
  _id: string;
  isFinished?: boolean;
  myParticipant?: { _id: string; pseudo: string } | null;
  winners?: RawEventWinner[];
  participantCount?: number;
  movieCount?: number;
  participants?: RawEventParticipantSummary[];
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
  const { _id, isFinished, myParticipant, winners, participants, ...rest } = raw;
  const mappedParticipants: EventParticipantSummary[] | undefined = participants
    ? participants.map((p) => ({
        id: p._id,
        pseudo: p.pseudo,
        isCreator: p.isCreator ?? false,
        avatarId: p.avatarId,
        handle: p.handle ?? null,
      }))
    : undefined;
  return {
    ...rest,
    id: _id,
    isFinished: isFinished ?? false,
    myParticipant: myParticipant
      ? { id: myParticipant._id, pseudo: myParticipant.pseudo }
      : myParticipant,
    winners: (winners ?? []).map((w) => ({
      ...w,
      movie: w.movie ? mapMovieData(w.movie) : null,
    })),
    participants: mappedParticipants,
  };
}

export type { RawEventData, RawMovieData, RawParticipantData };

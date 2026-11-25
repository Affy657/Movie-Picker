import type { ApiSchemas } from '@/shared/api/contract';

type EventDetail = ApiSchemas['EventDetailResponse'];
type EventConfig = ApiSchemas['EventConfigResponse'];
type EventParticipant = ApiSchemas['EventParticipantSummaryResponse'];
type Participant = ApiSchemas['ParticipantResponse'];

type Named<T extends { _id: string; pseudo: string }> = Pick<T, '_id' | 'pseudo'> & Partial<T>;

const EVENT_STAMP = '2026-01-01T00:00:00Z';

export function buildEventConfig(overrides: Partial<EventConfig> = {}): EventConfig {
  return {
    theme: null,
    themeColor: null,
    maxProposalsPerParticipant: null,
    maxParticipants: null,
    maxVotesPerParticipant: null,
    wheelMode: 'strictRandom',
    richSharePreview: false,
    allowSeries: false,
    anonymousProposals: false,
    winnerCount: 1,
    recurrence: null,
    hasNextOccurrence: false,
    groupId: null,
    ...overrides,
  };
}

function buildEventParticipant(person: Named<EventParticipant>): EventParticipant {
  return {
    isCreator: false,
    isCoHost: false,
    avatarId: '',
    handle: null,
    accentColor: null,
    ...person,
  };
}

function buildParticipant(eventId: string, person: Named<Participant>): Participant {
  return { eventId, createdAt: EVENT_STAMP, updatedAt: EVENT_STAMP, ...person };
}

interface EventDetailOverrides extends Partial<
  Omit<EventDetail, 'config' | 'participants' | 'myParticipant'>
> {
  config?: Partial<EventConfig>;
  participants?: Named<EventParticipant>[];
  myParticipant?: Named<Participant> | null;
}

export function buildEventDetail({
  config,
  participants = [],
  myParticipant = null,
  ...overrides
}: EventDetailOverrides = {}): EventDetail {
  const eventId = overrides._id ?? 'e1';
  return {
    _id: eventId,
    title: 'Soirée',
    date: '2030-01-01',
    time: '20:30',
    slug: 'soiree',
    recapSlug: null,
    closedAt: null,
    winners: [],
    createdAt: EVENT_STAMP,
    updatedAt: EVENT_STAMP,
    isHost: false,
    isFinished: false,
    lifecycle: overrides.isFinished ? 'finished' : 'upcoming',
    viewerRemoved: false,
    participantCount: participants.length,
    movieCount: 0,
    votersCount: 0,
    ...overrides,
    myParticipant: myParticipant && buildParticipant(eventId, myParticipant),
    participants: participants.map(buildEventParticipant),
    config: buildEventConfig(config),
  };
}

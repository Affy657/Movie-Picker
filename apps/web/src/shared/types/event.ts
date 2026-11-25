import type { ApiSchemas } from '@/shared/api/contract';

export type MyEventLifecycle = ApiSchemas['EventDetailResponse']['lifecycle'];

export type WheelMode = ApiSchemas['WheelMode'];

export type WinnerPickMethod = ApiSchemas['EventWinnerResponse']['pickMethod'];

export type EventRecurrence = ApiSchemas['RecurrenceFrequency'];

type ServedConfig = ApiSchemas['EventConfigResponse'];

export type EventConfigData = Pick<
  ServedConfig,
  'theme' | 'maxProposalsPerParticipant' | 'maxParticipants' | 'wheelMode' | 'winnerCount'
> &
  Partial<
    Pick<
      ServedConfig,
      | 'maxVotesPerParticipant'
      | 'richSharePreview'
      | 'allowSeries'
      | 'anonymousProposals'
      | 'recurrence'
      | 'hasNextOccurrence'
      | 'themeColor'
      | 'groupId'
    >
  >;

type ServedParticipant = ApiSchemas['EventParticipantSummaryResponse'];

export type EventParticipantSummary = Pick<ServedParticipant, 'pseudo'> &
  Partial<
    Pick<ServedParticipant, 'isCreator' | 'isCoHost' | 'avatarId' | 'handle' | 'accentColor'>
  > & {
    id: string;
  };

type ServedEvent = ApiSchemas['EventDetailResponse'];

export type EventData = Pick<ServedEvent, 'title' | 'date' | 'time' | 'slug'> &
  Partial<
    Pick<
      ServedEvent,
      | 'recapSlug'
      | 'isHost'
      | 'isFinished'
      | 'lifecycle'
      | 'closedAt'
      | 'winners'
      | 'participantCount'
      | 'votersCount'
      | 'movieCount'
      | 'viewerRemoved'
    >
  > & {
    id: string;
    config?: EventConfigData;
    myParticipant?: { id: string; pseudo: string } | null;
    participants?: EventParticipantSummary[];
  };

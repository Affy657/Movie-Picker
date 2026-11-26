import { ROUTES } from '@/app/routes';
import { fetchApi, apiPath, apiUrl } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import { mapEventData, mapParticipantData, mapMovieData } from '@/shared/api/apiMapping';
import type {
  EventConfigData,
  EventConfigPatchPayload,
  EventData,
  EventLimitCaps,
  MyEventsListResponse,
  MyEventsScope,
} from '@/features/events/types';
import type { MovieData, ParticipantData } from '@/shared/types/movie';

export async function fetchEventBySlug(slug: string): Promise<EventData> {
  const raw = await fetchApi<ApiSchemas['EventDetailResponse']>(apiPath('events', 'slug', slug));
  return mapEventData(raw);
}

export type RawNightRecap = ApiSchemas['NightRecapResponse'];

export type NightRecap = { event: EventData; winners: MovieData[]; eventSlug: string | null };

export async function fetchNightRecap(recapSlug: string): Promise<NightRecap> {
  const {
    recapSlug: ownSlug,
    eventSlug,
    winnerMovies,
    config,
    ...night
  } = await fetchApi<RawNightRecap>(apiPath('recaps', recapSlug));
  return {
    event: mapEventData({
      ...night,
      config: config ?? undefined,
      _id: '',
      slug: eventSlug ?? '',
      recapSlug: ownSlug,
    }),
    winners: winnerMovies.map(mapMovieData),
    eventSlug,
  };
}

export type CreateEventBody = {
  title: string;
  date: string;
  time: string;
  clientRequestId?: string;
  groupId?: string | null;
};

type RawCreateEventResponse = ApiSchemas['CreateEventResponse'];

export type CreateEventResponse = Pick<RawCreateEventResponse, 'slug' | 'shareUrl'> & {
  creatorParticipant?: { id: string; pseudo: string };
};

export async function createEvent(body: CreateEventBody): Promise<CreateEventResponse> {
  const raw = await fetchApi<RawCreateEventResponse>('/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return {
    ...raw,
    creatorParticipant: raw.creatorParticipant
      ? { id: raw.creatorParticipant._id, pseudo: raw.creatorParticipant.pseudo }
      : undefined,
  };
}

export function fetchMyEventsList(
  scope: MyEventsScope,
  offset = 0,
  q?: string,
  { previews = true }: { previews?: boolean } = {}
): Promise<MyEventsListResponse> {
  const params = new URLSearchParams({ scope });
  if (offset > 0) params.set('offset', String(offset));
  if (q) params.set('q', q);
  if (!previews) params.set('previews', 'false');
  return fetchApi<MyEventsListResponse>(`/events/mine?${params.toString()}`);
}

export type JoinEventResponse = {
  participant: ParticipantData;
  isNew: boolean;
  message: string;
};

type RawJoinEventResponse = ApiSchemas['JoinEventResult'];

export async function joinEvent(slug: string, pseudo: string): Promise<JoinEventResponse> {
  const raw = await fetchApi<RawJoinEventResponse>(apiPath('events', slug, 'join'), {
    method: 'POST',
    body: JSON.stringify({ pseudo }),
  });
  return {
    participant: mapParticipantData(raw.participant),
    isNew: raw.isNew,
    message: raw.message,
  };
}

export function fetchEventLimits(): Promise<EventLimitCaps> {
  return fetchApi<ApiSchemas['EventLimitsResponse']>(apiPath('events', 'limits'));
}

export function fetchEventConfig(slug: string): Promise<EventConfigData> {
  return fetchApi<EventConfigData>(apiPath('events', slug, 'config'));
}

export function patchEventConfig(
  slug: string,
  body: EventConfigPatchPayload
): Promise<EventConfigData> {
  return fetchApi<EventConfigData>(apiPath('events', slug, 'config'), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export type RawWinnerMovie = ApiSchemas['WinnerMovieResponse'];

function mapWinnerMovie(raw: RawWinnerMovie): MovieData {
  return mapMovieData({ ...raw, proposerPseudo: '', score: 0, up: 0, down: 0 });
}

export async function postEventWheel(
  slug: string,
  expectedWinnerCount?: number
): Promise<{ winner: MovieData; message: string }> {
  const raw = await fetchApi<ApiSchemas['WheelResponse']>(apiPath('events', slug, 'wheel'), {
    method: 'POST',
    body: JSON.stringify({ expectedWinnerCount }),
  });
  return { winner: mapWinnerMovie(raw.winner), message: raw.message };
}

export async function postEventWheelAnnounce(slug: string): Promise<void> {
  await fetchApi(apiPath('events', slug, 'wheel', 'announce'), { method: 'POST', body: '{}' });
}

export async function postEventWinner(
  slug: string,
  movieId: string
): Promise<{ winner: MovieData; message: string }> {
  const raw = await fetchApi<ApiSchemas['WheelResponse']>(apiPath('events', slug, 'winner'), {
    method: 'POST',
    body: JSON.stringify({ movieId }),
  });
  return { winner: mapWinnerMovie(raw.winner), message: raw.message };
}

export async function postEventClose(slug: string): Promise<void> {
  await fetchApi(apiPath('events', slug, 'close'), { method: 'POST', body: '{}' });
}

export async function deleteEventWheel(slug: string): Promise<void> {
  await fetchApi(apiPath('events', slug, 'wheel'), { method: 'DELETE' });
}

export async function deleteEventWinner(slug: string, movieId: string): Promise<void> {
  await fetchApi(apiPath('events', slug, 'winners', movieId), { method: 'DELETE' });
}

export type RemoveParticipantResponse = ApiSchemas['RemoveParticipantResponse'];

export async function markRatingPrompted(slug: string): Promise<void> {
  await fetchApi(apiPath('events', slug, 'rating-prompt'), { method: 'PUT' });
}

export async function setEventCoHost(
  slug: string,
  participantId: string,
  coHost: boolean
): Promise<void> {
  await fetchApi(apiPath('events', slug, 'co-hosts', participantId), {
    method: coHost ? 'PUT' : 'DELETE',
  });
}

export async function letRemovedPersonBackIn(slug: string, userId: string): Promise<void> {
  await fetchApi(apiPath('events', slug, 'removed-people', userId), { method: 'DELETE' });
}

export async function removeEventParticipant(
  slug: string,
  participantId: string
): Promise<RemoveParticipantResponse> {
  return fetchApi<RemoveParticipantResponse>(
    apiPath('events', slug, 'participants', participantId),
    { method: 'DELETE' }
  );
}

export type DeleteEventResponse = ApiSchemas['DeleteEventResponse'];

export async function deleteEvent(slug: string): Promise<DeleteEventResponse> {
  return fetchApi<DeleteEventResponse>(apiPath('events', slug), { method: 'DELETE' });
}

export function eventStreamUrl(slug: string, tab: string): string {
  return `${apiUrl(apiPath('events', slug, 'stream'))}?tab=${encodeURIComponent(tab)}`;
}

export async function setEventPresence(slug: string, proposing: boolean): Promise<void> {
  await fetchApi(apiPath('events', slug, 'presence'), {
    method: 'PUT',
    body: JSON.stringify({ proposing }),
  });
}

export function eventFrontendUrl(slug: string): string {
  return `${globalThis.location.origin}${ROUTES.eventDetail(encodeURIComponent(slug))}`;
}

export function nightRecapFrontendUrl(slug: string): string {
  return `${globalThis.location.origin}${ROUTES.nightRecap(encodeURIComponent(slug))}`;
}

export type EligibleFollowItem = ApiSchemas['EligibleFollowItem'];

export type EligibleFollowsResponse = ApiSchemas['EligibleFollowsResponse'];

export async function getEligibleFollows(slug: string): Promise<EligibleFollowsResponse> {
  return fetchApi<EligibleFollowsResponse>(
    apiPath('events', slug, 'invitations', 'eligible-follows')
  );
}

export async function sendEventInvitation(slug: string, targetUserId: string): Promise<void> {
  await fetchApi(apiPath('events', slug, 'invitations'), {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });
}

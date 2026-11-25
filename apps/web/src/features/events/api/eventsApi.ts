import { ROUTES } from '@/app/routes';
import { fetchApi, apiPath, apiUrl, withHostToken } from '@/shared/api/client';
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

export async function fetchEventBySlug(slug: string, hostToken: string | null): Promise<EventData> {
  const raw = await fetchApi<ApiSchemas['EventDetailResponse']>(
    apiPath('events', 'slug', slug),
    withHostToken(hostToken)
  );
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
  q?: string
): Promise<MyEventsListResponse> {
  const params = new URLSearchParams({ scope });
  if (offset > 0) params.set('offset', String(offset));
  if (q) params.set('q', q);
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
  hostToken: string | null,
  body: EventConfigPatchPayload
): Promise<EventConfigData> {
  return fetchApi<EventConfigData>(
    apiPath('events', slug, 'config'),
    withHostToken(hostToken, { method: 'PATCH', body: JSON.stringify(body) })
  );
}

export type RawWinnerMovie = ApiSchemas['WinnerMovieResponse'];

function mapWinnerMovie(raw: RawWinnerMovie): MovieData {
  return mapMovieData({ ...raw, proposerPseudo: '', score: 0, up: 0, down: 0 });
}

export async function postEventWheel(
  slug: string,
  hostToken: string | null,
  expectedWinnerCount?: number
): Promise<{ winner: MovieData; message: string }> {
  const raw = await fetchApi<ApiSchemas['WheelResponse']>(
    apiPath('events', slug, 'wheel'),
    withHostToken(hostToken, { method: 'POST', body: JSON.stringify({ expectedWinnerCount }) })
  );
  return { winner: mapWinnerMovie(raw.winner), message: raw.message };
}

export async function postEventWheelAnnounce(
  slug: string,
  hostToken: string | null
): Promise<void> {
  await fetchApi(
    apiPath('events', slug, 'wheel', 'announce'),
    withHostToken(hostToken, { method: 'POST', body: '{}' })
  );
}

export async function postEventWinner(
  slug: string,
  movieId: string,
  hostToken: string | null
): Promise<{ winner: MovieData; message: string }> {
  const raw = await fetchApi<ApiSchemas['WheelResponse']>(
    apiPath('events', slug, 'winner'),
    withHostToken(hostToken, { method: 'POST', body: JSON.stringify({ movieId }) })
  );
  return { winner: mapWinnerMovie(raw.winner), message: raw.message };
}

export async function postEventClose(slug: string, hostToken: string | null): Promise<void> {
  await fetchApi(
    apiPath('events', slug, 'close'),
    withHostToken(hostToken, { method: 'POST', body: '{}' })
  );
}

export async function deleteEventWheel(slug: string, hostToken: string | null): Promise<void> {
  await fetchApi(apiPath('events', slug, 'wheel'), withHostToken(hostToken, { method: 'DELETE' }));
}

export async function deleteEventWinner(
  slug: string,
  movieId: string,
  hostToken: string | null
): Promise<void> {
  await fetchApi(
    apiPath('events', slug, 'winners', movieId),
    withHostToken(hostToken, { method: 'DELETE' })
  );
}

export type RemoveParticipantResponse = ApiSchemas['RemoveParticipantResponse'];

export async function setEventCoHost(
  idOrSlug: string,
  participantId: string,
  coHost: boolean
): Promise<void> {
  await fetchApi(apiPath('events', idOrSlug, 'co-hosts', participantId), {
    method: coHost ? 'PUT' : 'DELETE',
  });
}

export async function removeEventParticipant(
  idOrSlug: string,
  participantId: string,
  hostToken: string | null
): Promise<RemoveParticipantResponse> {
  return fetchApi<RemoveParticipantResponse>(
    apiPath('events', idOrSlug, 'participants', participantId),
    withHostToken(hostToken, { method: 'DELETE' })
  );
}

export type DeleteEventResponse = ApiSchemas['DeleteEventResponse'];

export async function deleteEvent(idOrSlug: string): Promise<DeleteEventResponse> {
  return fetchApi<DeleteEventResponse>(apiPath('events', idOrSlug), { method: 'DELETE' });
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

export async function getEligibleFollows(idOrSlug: string): Promise<EligibleFollowsResponse> {
  return fetchApi<EligibleFollowsResponse>(
    apiPath('events', idOrSlug, 'invitations', 'eligible-follows')
  );
}

export async function sendEventInvitation(idOrSlug: string, targetUserId: string): Promise<void> {
  await fetchApi(apiPath('events', idOrSlug, 'invitations'), {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });
}

import { fetchApi, apiUrl } from '@/shared/api/client';
import {
  mapEventData,
  mapParticipantData,
  mapMovieData,
  type RawEventData,
  type RawParticipantData,
  type RawMovieData,
} from '@/shared/api/apiMapping';
import type {
  EventConfigData,
  EventConfigPatchPayload,
  EventData,
  MyEventsListResponse,
  MyEventsScope,
} from '@/features/events/types';
import type { MovieData, ParticipantData } from '@/shared/types/movie';

function hostQuery(hostToken: string | null): string {
  return hostToken ? `?host=${encodeURIComponent(hostToken)}` : '';
}

export function eventDetailPath(slug: string, hostToken: string | null): string {
  return `/events/slug/${slug}${hostQuery(hostToken)}`;
}

export async function fetchEventBySlug(slug: string, hostToken: string | null): Promise<EventData> {
  const raw = await fetchApi<RawEventData>(eventDetailPath(slug, hostToken));
  return mapEventData(raw);
}

export type CreateEventBody = { title: string; date: string; time: string };

export type CreateEventResponse = {
  slug: string;
  shareUrl: string;
  creatorParticipant?: { id: string; pseudo: string };
};

type RawCreateEventResponse = Omit<CreateEventResponse, 'creatorParticipant'> & {
  creatorParticipant?: { _id: string; pseudo: string };
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

type RawJoinEventResponse = {
  participant: RawParticipantData;
  isNew: boolean;
  message: string;
};

export async function joinEvent(slug: string, pseudo: string): Promise<JoinEventResponse> {
  const raw = await fetchApi<RawJoinEventResponse>(`/events/${slug}/join`, {
    method: 'POST',
    body: JSON.stringify({ pseudo }),
  });
  return {
    participant: mapParticipantData(raw.participant),
    isNew: raw.isNew,
    message: raw.message,
  };
}

export function fetchEventConfig(slug: string): Promise<EventConfigData> {
  return fetchApi<EventConfigData>(`/events/${slug}/config`);
}

export function patchEventConfig(
  slug: string,
  hostToken: string | null,
  body: EventConfigPatchPayload
): Promise<EventConfigData> {
  return fetchApi<EventConfigData>(`/events/${slug}/config${hostQuery(hostToken)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function postEventWheel(
  slug: string,
  hostToken: string | null
): Promise<{ winner: MovieData; message: string }> {
  const raw = await fetchApi<{ winner: RawMovieData; message: string }>(
    `/events/${slug}/wheel${hostQuery(hostToken)}`,
    { method: 'POST', body: '{}' }
  );
  return { winner: mapMovieData(raw.winner), message: raw.message };
}

export async function postEventWinner(
  slug: string,
  movieId: string,
  hostToken: string | null
): Promise<{ winner: MovieData; message: string }> {
  const raw = await fetchApi<{ winner: RawMovieData; message: string }>(
    `/events/${slug}/winner${hostQuery(hostToken)}`,
    { method: 'POST', body: JSON.stringify({ movieId }) }
  );
  return { winner: mapMovieData(raw.winner), message: raw.message };
}

export async function postEventClose(slug: string, hostToken: string | null): Promise<void> {
  await fetchApi(`/events/${slug}/close${hostQuery(hostToken)}`, { method: 'POST', body: '{}' });
}

export async function deleteEventWheel(slug: string, hostToken: string | null): Promise<void> {
  await fetchApi(`/events/${slug}/wheel${hostQuery(hostToken)}`, { method: 'DELETE' });
}

export async function deleteEventWinner(
  slug: string,
  movieId: string,
  hostToken: string | null
): Promise<void> {
  await fetchApi(`/events/${slug}/winners/${movieId}${hostQuery(hostToken)}`, { method: 'DELETE' });
}

export type RemoveParticipantResponse = {
  participantId: string;
  eventId: string;
  removedMovies: number;
  message: string;
};

export async function removeEventParticipant(
  idOrSlug: string,
  participantId: string,
  hostToken: string | null
): Promise<RemoveParticipantResponse> {
  return fetchApi<RemoveParticipantResponse>(
    `/events/${idOrSlug}/participants/${participantId}${hostQuery(hostToken)}`,
    { method: 'DELETE' }
  );
}

export type DeleteEventResponse = {
  eventId: string;
  slug: string;
  message: string;
  removedParticipants: number;
  removedMovies: number;
  removedVotes: number;
  removedSeenMarks: number;
};

export async function deleteEvent(idOrSlug: string): Promise<DeleteEventResponse> {
  return fetchApi<DeleteEventResponse>(`/events/${idOrSlug}`, { method: 'DELETE' });
}

export function eventSharePreviewUrl(slug: string): string {
  return apiUrl(`/events/slug/${slug}/share-preview`);
}

export function eventFrontendUrl(slug: string): string {
  return `${globalThis.location.origin}/e/${slug}`;
}

export interface EligibleFollowItem {
  userId: string;
  handle: string;
  displayName: string;
  avatarId: string;
  isAlreadyParticipant: boolean;
  isAlreadyInvited: boolean;
}

export interface EligibleFollowsResponse {
  follows: EligibleFollowItem[];
}

export async function getEligibleFollows(idOrSlug: string): Promise<EligibleFollowsResponse> {
  return fetchApi<EligibleFollowsResponse>(`/events/${idOrSlug}/invitations/eligible-follows`);
}

export async function sendEventInvitation(idOrSlug: string, targetUserId: string): Promise<void> {
  await fetchApi(`/events/${idOrSlug}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });
}

import { fetchApi } from '@/shared/api/client';
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

export function fetchMyEventsList(): Promise<MyEventsListResponse> {
  return fetchApi<MyEventsListResponse>('/events/mine');
}

export type JoinEventResponse = ParticipantData | { participant: ParticipantData; message: string };

type RawJoinEventResponse =
  | RawParticipantData
  | { participant: RawParticipantData; message: string };

export async function joinEvent(slug: string, pseudo: string): Promise<JoinEventResponse> {
  const raw = await fetchApi<RawJoinEventResponse>(`/events/${slug}/join`, {
    method: 'POST',
    body: JSON.stringify({ pseudo }),
  });
  if ('participant' in raw) {
    return { participant: mapParticipantData(raw.participant), message: raw.message };
  }
  return mapParticipantData(raw);
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
    { method: 'POST' }
  );
  return { winner: mapMovieData(raw.winner), message: raw.message };
}

export async function postEventClose(slug: string, hostToken: string | null): Promise<void> {
  await fetchApi(`/events/${slug}/close${hostQuery(hostToken)}`, { method: 'POST' });
}

import { request } from './client';
import type { components } from './types.gen';

type Schemas = components['schemas'];
export type CreateEventRequest = Schemas['CreateEventRequest'];
export type CreateEventResponse = Schemas['CreateEventResponse'];
export type EventDetailResponse = Schemas['EventDetailResponse'];
export type EventConfigResponse = Schemas['EventConfigResponse'];
export type PatchEventConfigRequest = Schemas['PatchEventConfigRequest'];
export type JoinEventRequest = Schemas['JoinEventRequest'];
export type JoinEventResult = Schemas['JoinEventResult'];
export type CloseEventResponse = Schemas['CloseEventResponse'];
export type RemoveParticipantResponse = Schemas['RemoveParticipantResponse'];
export type MyEventSummary = Schemas['MyEventSummaryDto'];
export type MyEventsListResponse = Schemas['MyEventsListResponse'];
export type WheelResponse = Schemas['WheelResponse'];

export function createEvent(body: CreateEventRequest) {
  return request<CreateEventResponse>('/events', { method: 'POST', body });
}

export function getMyEvents() {
  return request<MyEventsListResponse>('/events/mine');
}

export function getEvent(slug: string) {
  return request<EventDetailResponse>(`/events/slug/${encodeURIComponent(slug)}`);
}

export function getConfig(idOrSlug: string) {
  return request<EventConfigResponse>(`/events/${encodeURIComponent(idOrSlug)}/config`);
}

export function patchConfig(idOrSlug: string, body: PatchEventConfigRequest, hostToken?: string) {
  return request<EventConfigResponse>(`/events/${encodeURIComponent(idOrSlug)}/config`, {
    method: 'PATCH',
    body,
    query: hostToken ? { host: hostToken } : undefined,
  });
}

export function joinEvent(idOrSlug: string, body: JoinEventRequest) {
  return request<JoinEventResult>(`/events/${encodeURIComponent(idOrSlug)}/join`, {
    method: 'POST',
    body,
    noAuth: true,
  });
}

export function spinWheel(idOrSlug: string) {
  return request<WheelResponse>(`/events/${encodeURIComponent(idOrSlug)}/wheel`, {
    method: 'POST',
  });
}

export function closeEvent(idOrSlug: string) {
  return request<CloseEventResponse>(`/events/${encodeURIComponent(idOrSlug)}/close`, {
    method: 'POST',
  });
}

export function removeParticipant(idOrSlug: string, participantId: string) {
  return request<RemoveParticipantResponse>(
    `/events/${encodeURIComponent(idOrSlug)}/participants/${encodeURIComponent(participantId)}`,
    { method: 'DELETE' }
  );
}

export function deleteEvent(idOrSlug: string) {
  return request<void>(`/events/${encodeURIComponent(idOrSlug)}`, { method: 'DELETE' });
}

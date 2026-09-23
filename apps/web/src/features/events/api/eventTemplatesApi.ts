import { apiPath, fetchApi } from '@/shared/api/client';
import type { EventTemplateData, SaveEventTemplateBody } from '@/features/events/types';

const BASE_SEGMENTS = ['users', 'me', 'event-templates'] as const;

type EventTemplateListResponse = { items: EventTemplateData[] };

export async function fetchEventTemplates(): Promise<EventTemplateData[]> {
  const response = await fetchApi<EventTemplateListResponse>(apiPath(...BASE_SEGMENTS));
  return response.items ?? [];
}

export function createEventTemplate(body: SaveEventTemplateBody): Promise<EventTemplateData> {
  return fetchApi<EventTemplateData>(apiPath(...BASE_SEGMENTS), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateEventTemplate(
  templateId: string,
  body: SaveEventTemplateBody
): Promise<EventTemplateData> {
  return fetchApi<EventTemplateData>(apiPath(...BASE_SEGMENTS, templateId), {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteEventTemplate(templateId: string): Promise<void> {
  return fetchApi<void>(apiPath(...BASE_SEGMENTS, templateId), { method: 'DELETE' });
}

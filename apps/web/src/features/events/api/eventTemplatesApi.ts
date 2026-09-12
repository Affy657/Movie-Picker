import { fetchApi } from '@/shared/api/client';
import type { EventTemplateData, SaveEventTemplateBody } from '@/features/events/types';

const BASE_PATH = '/users/me/event-templates';

type EventTemplateListResponse = { items: EventTemplateData[] };

export async function fetchEventTemplates(): Promise<EventTemplateData[]> {
  const response = await fetchApi<EventTemplateListResponse>(BASE_PATH);
  return response.items ?? [];
}

export function createEventTemplate(body: SaveEventTemplateBody): Promise<EventTemplateData> {
  return fetchApi<EventTemplateData>(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateEventTemplate(
  templateId: string,
  body: SaveEventTemplateBody
): Promise<EventTemplateData> {
  return fetchApi<EventTemplateData>(`${BASE_PATH}/${encodeURIComponent(templateId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteEventTemplate(templateId: string): Promise<void> {
  return fetchApi<void>(`${BASE_PATH}/${encodeURIComponent(templateId)}`, { method: 'DELETE' });
}

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  createEventTemplate,
  deleteEventTemplate,
  fetchEventTemplates,
  updateEventTemplate,
} from '@/features/events/api/eventTemplatesApi';
import type { SaveEventTemplateBody } from '@/features/events/types';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));

const mockFetchApi = vi.mocked(fetchApi);

const body: SaveEventTemplateBody = {
  name: 'Soirée horreur',
  theme: null,
  maxProposalsPerParticipant: null,
  maxParticipants: null,
  maxVotesPerParticipant: null,
  wheelMode: 'strictRandom',
  richSharePreview: false,
  allowSeries: false,
  winnerCount: 1,
};

beforeEach(() => {
  mockFetchApi.mockReset();
  mockFetchApi.mockResolvedValue({ items: [] });
});

describe('event template API paths', () => {
  it('lists and creates the templates of the signed-in user', async () => {
    await fetchEventTemplates();
    await createEventTemplate(body);

    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/users/me/event-templates');
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/users/me/event-templates', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  });

  it('keeps a crafted template id inside its own path segment', async () => {
    await updateEventTemplate('t/1?x#y', body);
    await deleteEventTemplate('t/1?x#y');

    expect(mockFetchApi).toHaveBeenNthCalledWith(1, '/users/me/event-templates/t%2F1%3Fx%23y', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    expect(mockFetchApi).toHaveBeenNthCalledWith(2, '/users/me/event-templates/t%2F1%3Fx%23y', {
      method: 'DELETE',
    });
  });

  it('refuses a template id the URL parser would collapse into the parent path', () => {
    expect(() => updateEventTemplate('..', body)).toThrow('Invalid API path segment');
    expect(() => deleteEventTemplate('..')).toThrow('Invalid API path segment');
    expect(mockFetchApi).not.toHaveBeenCalled();
  });
});

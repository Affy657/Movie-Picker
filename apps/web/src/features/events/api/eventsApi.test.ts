import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApi } from '@/shared/api/client';
import {
  deleteEvent,
  deleteEventWheel,
  deleteEventWinner,
  eventFrontendUrl,
  fetchEventBySlug,
  fetchEventConfig,
  getEligibleFollows,
  joinEvent,
  patchEventConfig,
  postEventClose,
  postEventWheel,
  postEventWheelAnnounce,
  postEventWinner,
  removeEventParticipant,
  sendEventInvitation,
} from '@/features/events/api/eventsApi';

vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: vi.fn(),
}));
vi.mock('@/shared/api/apiMapping', () => ({
  mapEventData: vi.fn((raw: unknown) => raw),
  mapParticipantData: vi.fn((raw: unknown) => raw),
  mapMovieData: vi.fn((raw: unknown) => raw),
}));

const mockFetchApi = vi.mocked(fetchApi);

const craftedSlug = 'Ab3dE_9xYz?x#y';
const encodedSlug = 'Ab3dE_9xYz%3Fx%23y';

function requestedPath(): string {
  const [path] = mockFetchApi.mock.calls[0] ?? [];
  return String(path);
}

beforeEach(() => {
  mockFetchApi.mockReset();
  mockFetchApi.mockResolvedValue({ participant: {}, winner: {} });
});

describe('event API paths', () => {
  it.each([
    ['fetchEventBySlug', () => fetchEventBySlug(craftedSlug), `/events/slug/${encodedSlug}`],
    ['joinEvent', () => joinEvent(craftedSlug, 'Guest'), `/events/${encodedSlug}/join`],
    ['fetchEventConfig', () => fetchEventConfig(craftedSlug), `/events/${encodedSlug}/config`],
    ['patchEventConfig', () => patchEventConfig(craftedSlug, {}), `/events/${encodedSlug}/config`],
    ['postEventWheel', () => postEventWheel(craftedSlug), `/events/${encodedSlug}/wheel`],
    [
      'postEventWheelAnnounce',
      () => postEventWheelAnnounce(craftedSlug),
      `/events/${encodedSlug}/wheel/announce`,
    ],
    ['postEventWinner', () => postEventWinner(craftedSlug, 'm1'), `/events/${encodedSlug}/winner`],
    ['postEventClose', () => postEventClose(craftedSlug), `/events/${encodedSlug}/close`],
    ['deleteEventWheel', () => deleteEventWheel(craftedSlug), `/events/${encodedSlug}/wheel`],
    [
      'deleteEventWinner',
      () => deleteEventWinner(craftedSlug, 'm/1'),
      `/events/${encodedSlug}/winners/m%2F1`,
    ],
    [
      'removeEventParticipant',
      () => removeEventParticipant(craftedSlug, 'p?1'),
      `/events/${encodedSlug}/participants/p%3F1`,
    ],
    ['deleteEvent', () => deleteEvent(craftedSlug), `/events/${encodedSlug}`],
    [
      'getEligibleFollows',
      () => getEligibleFollows(craftedSlug),
      `/events/${encodedSlug}/invitations/eligible-follows`,
    ],
    [
      'sendEventInvitation',
      () => sendEventInvitation(craftedSlug, 'u1'),
      `/events/${encodedSlug}/invitations`,
    ],
  ])('%s keeps a crafted slug inside its own path segment', async (_name, call, expected) => {
    await call();

    expect(requestedPath()).toBe(expected);
  });

  it('builds the shareable event link with an encoded slug', () => {
    expect(eventFrontendUrl(craftedSlug)).toBe(`${globalThis.location.origin}/e/${encodedSlug}`);
  });
});

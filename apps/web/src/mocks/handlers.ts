import { http, HttpResponse } from 'msw';
import type { components } from '@/shared/api/generated/openapiSchema';

type Schemas = components['schemas'];

type EventDetailPayload = Schemas['EventDetailResponse'];

export const TEST_API_BASE = 'http://127.0.0.1:3999';

export const TEST_API_V1 = `${TEST_API_BASE}/api/v1`;

const V1 = TEST_API_V1;

export const authMeGuestHandler = http.get(`${V1}/auth/me`, () =>
  HttpResponse.json(
    { error: 'Authentication required', code: 401, reason: 'unauthorized' },
    { status: 401 }
  )
);

export function createWatchlistHandlers(items: unknown[], availability: unknown[] = []) {
  return [
    http.get(`${V1}/watchlist`, () => HttpResponse.json({ items })),
    http.get(`${V1}/watchlist/availability`, () =>
      HttpResponse.json({ items: availability, partial: false })
    ),
  ];
}

const EMPTY_LETTERBOXD_SYNC: Schemas['LetterboxdSyncResponse'] = {
  skipped: false,
  error: null,
  added: 0,
  removed: 0,
  unmatchedTitles: [],
  pendingChoices: [],
  totalOnLetterboxd: 0,
  totalTruncated: 0,
  watchedAdded: 0,
  watchedRemoved: 0,
  watchedUnmatchedTitles: [],
  watchedPendingChoices: [],
  watchedTotalOnLetterboxd: 0,
  watchedTotalTruncated: 0,
};

export function createLetterboxdSyncHandler(report: Schemas['LetterboxdSyncResponse'] = {}) {
  return http.post(`${V1}/letterboxd/sync`, () =>
    HttpResponse.json({ ...EMPTY_LETTERBOXD_SYNC, ...report })
  );
}

export function createLetterboxdConfirmHandler(
  onConfirm: (body: Schemas['LetterboxdImportConfirmRequest']) => void = () => undefined,
  result: Schemas['LetterboxdImportConfirmResponse'] = {}
) {
  return http.post(`${V1}/letterboxd/confirm`, async ({ request }) => {
    onConfirm((await request.json()) as Schemas['LetterboxdImportConfirmRequest']);
    const body: Schemas['LetterboxdImportConfirmResponse'] = {
      added: 0,
      alreadyPresent: 0,
      watchedAdded: 0,
      watchedAlreadyPresent: 0,
      pendingReconciliationCount: 0,
      ...result,
    };
    return HttpResponse.json(body);
  });
}

interface MockListItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string;
  posterPath: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  genreIds?: number[];
  createdAt?: string;
  isWatched?: boolean;
  addedBy?: MockListPerson;
}

export interface MockListPerson {
  userId: string;
  handle: string | null;
  displayName: string;
  avatarId: string | null;
}

export const MOCK_LIST_OWNER: MockListPerson = {
  userId: 'u1',
  handle: 'alice',
  displayName: 'Alice',
  avatarId: null,
};

export interface MockList {
  id: string;
  name: string;
  description?: string | null;
  items?: MockListItem[];
  createdAt?: string;
  updatedAt?: string;
  role?: 'owner' | 'member';
  owner?: MockListPerson;
  memberCount?: number;
  memberPreview?: MockListPerson[];
  isPublic?: boolean;
}

const MOCK_LIST_LIMIT = 50;

const MOCK_LIST_ITEM_LIMIT = 500;

const MOCK_RESERVED_LIST_NAMES = ['À voir', 'Watchlist', 'Films vus', 'Watched'];

const MOCK_LIST_DATE = '2026-11-01T00:00:00Z';

function mockListError(status: number, reason: string, params?: Record<string, string | number>) {
  return HttpResponse.json({ error: reason, code: status, reason, params }, { status });
}

function sameMockListName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function mockListAudience(list: Required<MockList>) {
  return {
    role: list.role,
    owner: list.owner,
    memberCount: list.memberCount,
    memberPreview: list.memberPreview,
  };
}

function mockListSummary(list: Required<MockList>, containing?: MockListItem | null) {
  const summary: Schemas['MovieListSummaryResponse'] = {
    ...mockListAudience(list),
    id: list.id,
    name: list.name,
    description: list.description,
    isPublic: list.isPublic,
    itemCount: list.items.length,
    posterPaths: list.items
      .flatMap((item) => (item.posterPath ? [item.posterPath] : []))
      .slice(0, 3),
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    containsMovie: !!containing && list.items.some((item) => sameMockItem(item, containing)),
    watchedCount: list.items.filter((item) => item.isWatched).length,
  };
  return summary;
}

function sameMockItem(a: Pick<MockListItem, 'tmdbId' | 'mediaType'>, b: MockListItem): boolean {
  return a.tmdbId === b.tmdbId && (a.mediaType ?? 'movie') === (b.mediaType ?? 'movie');
}

function withListDefaults(list: MockList): Required<MockList> {
  const owner = list.owner ?? MOCK_LIST_OWNER;
  return {
    description: null,
    createdAt: MOCK_LIST_DATE,
    updatedAt: MOCK_LIST_DATE,
    role: 'owner',
    memberCount: 1,
    memberPreview: [owner],
    isPublic: false,
    ...list,
    owner,
    items: [...(list.items ?? [])],
  };
}

export function createListsHandlers(initial: MockList[] = []) {
  const lists: Required<MockList>[] = initial.map(withListDefaults);
  const find = (id: unknown) => lists.find((list) => list.id === id);
  const nameTaken = (name: string, exceptId?: string) =>
    MOCK_RESERVED_LIST_NAMES.some((reserved) => sameMockListName(name, reserved)) ||
    lists.some((list) => list.id !== exceptId && sameMockListName(list.name, name));
  let nextId = lists.length + 1;

  return [
    http.get(`${V1}/lists`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const tmdbId = Number(params.get('tmdbId'));
      const containing = tmdbId
        ? ({ tmdbId, mediaType: params.get('mediaType') ?? 'movie' } as MockListItem)
        : null;
      return HttpResponse.json({ items: lists.map((list) => mockListSummary(list, containing)) });
    }),
    http.post(`${V1}/lists`, async ({ request }) => {
      const body = (await request.json()) as {
        name: string;
        description?: string | null;
        isPublic?: boolean;
        firstItem?: MockListItem;
      };
      if (nameTaken(body.name)) {
        return mockListError(409, 'list_name_taken', { name: body.name.trim() });
      }
      if (lists.length >= MOCK_LIST_LIMIT) {
        return mockListError(409, 'list_limit_reached', { max: MOCK_LIST_LIMIT });
      }
      const list = withListDefaults({
        id: `l${nextId++}`,
        name: body.name.trim(),
        description: body.description ?? null,
        isPublic: body.isPublic ?? false,
        items: body.firstItem ? [{ ...body.firstItem, createdAt: MOCK_LIST_DATE }] : [],
      });
      lists.push(list);
      return HttpResponse.json(mockListSummary(list), { status: 201 });
    }),
    http.get(`${V1}/lists/:id`, ({ params }) => {
      const list = find(params.id);
      if (!list) return mockListError(404, 'list_not_found');
      const { id, name, description, isPublic, createdAt, updatedAt, items } = list;
      const detail: Schemas['MovieListResponse'] = {
        ...mockListAudience(list),
        id,
        name,
        description,
        isPublic,
        createdAt,
        updatedAt,
        items,
      };
      return HttpResponse.json(detail);
    }),
    http.patch(`${V1}/lists/:id`, async ({ params, request }) => {
      const list = find(params.id);
      if (!list) return mockListError(404, 'list_not_found');
      const body = (await request.json()) as {
        name: string;
        description?: string | null;
        isPublic?: boolean;
      };
      if (nameTaken(body.name, list.id)) {
        return mockListError(409, 'list_name_taken', { name: body.name.trim() });
      }
      list.name = body.name.trim();
      list.description = body.description ?? null;
      list.isPublic = body.isPublic ?? list.isPublic;
      return HttpResponse.json(mockListSummary(list));
    }),
    http.delete(`${V1}/lists/:id`, ({ params }) => {
      const list = find(params.id);
      if (!list) return mockListError(404, 'list_not_found');
      lists.splice(lists.indexOf(list), 1);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${V1}/lists/:id/items`, async ({ params, request }) => {
      const list = find(params.id);
      if (!list) return mockListError(404, 'list_not_found');
      const item = (await request.json()) as MockListItem;
      if (list.items.some((existing) => sameMockItem(item, existing))) {
        return HttpResponse.json(item, { status: 200 });
      }
      if (list.items.length >= MOCK_LIST_ITEM_LIMIT) {
        return mockListError(409, 'list_full', { max: MOCK_LIST_ITEM_LIMIT });
      }
      list.items.push({ ...item, createdAt: MOCK_LIST_DATE });
      return HttpResponse.json(item, { status: 201 });
    }),
    http.delete(`${V1}/lists/:id/items/:tmdbId`, ({ params, request }) => {
      const list = find(params.id);
      if (!list) return mockListError(404, 'list_not_found');
      const target = {
        tmdbId: Number(params.tmdbId),
        mediaType: (new URL(request.url).searchParams.get('mediaType') ?? 'movie') as
          'movie' | 'tv',
      };
      list.items = list.items.filter((item) => !sameMockItem(target, item));
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

export interface MockListMember extends MockListPerson {
  isOwner?: boolean;
  joinedAt?: string;
}

export interface MockListMembership {
  maxMembers?: number;
  members: MockListMember[];
  invitations?: MockListPerson[] | null;
  inviteLink?: Schemas['MovieListInviteLinkResponse'] | null;
  invitable?: MockListPerson[];
}

const MOCK_INVITE_LINK_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function createListMembershipHandlers(listId: string, initial: MockListMembership) {
  const state = {
    maxMembers: initial.maxMembers ?? 20,
    members: initial.members.map((member) => ({
      isOwner: false,
      joinedAt: MOCK_LIST_DATE,
      ...member,
    })),
    invitations:
      initial.invitations === null
        ? null
        : (initial.invitations ?? []).map((person) => ({ ...person, invitedAt: MOCK_LIST_DATE })),
    inviteLink: initial.inviteLink ?? null,
    invitable: [...(initial.invitable ?? [])],
  };
  const route = `${V1}/lists/${listId}`;
  const seatsTaken = () => state.members.length + (state.invitations?.length ?? 0);

  return [
    http.get(`${route}/members`, () => {
      const body: Schemas['MovieListMembersResponse'] = {
        maxMembers: state.maxMembers,
        members: state.members,
        invitations: state.invitations,
        inviteLink: state.inviteLink ?? undefined,
      };
      return HttpResponse.json(body);
    }),
    http.get(`${route}/invitable`, () =>
      HttpResponse.json({
        users: state.invitable,
      } satisfies Schemas['MovieListInvitableUsersResponse'])
    ),
    http.post(`${route}/invitations`, async ({ request }) => {
      const { userId } = (await request.json()) as Schemas['InviteToMovieListRequest'];
      if (seatsTaken() >= state.maxMembers) {
        return mockListError(409, 'list_members_limit_reached', { max: state.maxMembers });
      }
      const person = state.invitable.find((candidate) => candidate.userId === userId);
      if (!person) return mockListError(400, 'invite_only_followed');
      state.invitable = state.invitable.filter((candidate) => candidate.userId !== userId);
      state.invitations = [...(state.invitations ?? []), { ...person, invitedAt: MOCK_LIST_DATE }];
      return HttpResponse.json({ ...person, invitedAt: MOCK_LIST_DATE }, { status: 201 });
    }),
    http.delete(`${route}/invitations/:userId`, ({ params }) => {
      const invitation = state.invitations?.find((person) => person.userId === params.userId);
      if (!invitation) return mockListError(404, 'list_invitation_not_found');
      state.invitations = (state.invitations ?? []).filter((person) => person !== invitation);
      const { userId, handle, displayName, avatarId } = invitation;
      state.invitable = [...state.invitable, { userId, handle, displayName, avatarId }];
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(`${route}/members/:userId`, ({ params }) => {
      state.members = state.members.filter((member) => member.userId !== params.userId);
      state.inviteLink = state.inviteLink ? { ...state.inviteLink, active: false } : null;
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${route}/leave`, () => new HttpResponse(null, { status: 204 })),
    http.post(`${route}/invite-link`, () => {
      state.inviteLink = {
        token: 'nouveau-lien',
        expiresAt: new Date(Date.now() + MOCK_INVITE_LINK_LIFETIME_MS).toISOString(),
        active: true,
      };
      return HttpResponse.json(state.inviteLink);
    }),
    http.delete(`${route}/invite-link`, () => {
      state.inviteLink = state.inviteLink ? { ...state.inviteLink, active: false } : null;
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

export function createListJoinHandlers(
  token: string,
  preview: Schemas['MovieListInvitePreviewResponse'] | null,
  joined: Schemas['MovieListSummaryResponse'] = {}
) {
  const route = `${V1}/lists/join/${token}`;
  return [
    http.get(route, () =>
      preview ? HttpResponse.json(preview) : mockListError(404, 'list_invite_link_invalid')
    ),
    http.post(route, () =>
      preview
        ? HttpResponse.json(joined, { status: 201 })
        : mockListError(404, 'list_invite_link_invalid')
    ),
  ];
}

export interface MockListCreator {
  handle: string;
  displayName: string;
  avatarId: string | null;
}

export interface MockSavedList {
  id: string;
  sourceType: 'tmdbCollection' | 'explorerTheme' | 'memberList';
  sourceId: string;
  name: string | null;
  description?: string | null;
  creator?: MockListCreator | null;
  items?: MockListItem[];
  createdAt?: string;
  unavailable?: boolean;
  unavailableReason?: 'private' | 'deleted' | null;
  copyAvailable?: boolean;
}

type StoredSavedList = Required<MockSavedList>;

function withSavedDefaults(list: MockSavedList): StoredSavedList {
  return {
    items: [],
    createdAt: MOCK_LIST_DATE,
    description: null,
    creator: null,
    unavailable: false,
    unavailableReason: null,
    copyAvailable: !list.unavailable,
    ...list,
  };
}

function mockSavedSummary(list: StoredSavedList) {
  const items = list.unavailable ? [] : list.items;
  const summary: Schemas['SavedListSummaryResponse'] = {
    id: list.id,
    sourceType: list.sourceType,
    sourceId: list.sourceId,
    name: list.name,
    description: list.description,
    creator: list.creator ?? undefined,
    itemCount: items.length,
    posterPaths: items.flatMap((item) => (item.posterPath ? [item.posterPath] : [])).slice(0, 3),
    watchedCount: items.filter((item) => item.isWatched).length,
    createdAt: list.createdAt,
    unavailable: list.unavailable,
    unavailableReason: list.unavailableReason ?? undefined,
    copyAvailable: list.copyAvailable,
  };
  return summary;
}

function mockSavedDetail(list: StoredSavedList) {
  const items = list.unavailable ? [] : list.items;
  const detail: Schemas['SavedListResponse'] = {
    ...mockSavedSummary(list),
    items: items.map((item) => ({ ...item, createdAt: list.createdAt })),
  };
  return detail;
}

export function createSavedListsHandlers(
  initial: MockSavedList[] = [],
  catalog: MockSavedList[] = []
) {
  const saved = initial.map(withSavedDefaults);
  const find = (id: unknown) => saved.find((list) => list.id === id);
  const fromSource =
    (sourceType: string | null, sourceId: string | null) =>
    (list: Pick<MockSavedList, 'sourceType' | 'sourceId'>) =>
      list.sourceType === sourceType && list.sourceId === sourceId;
  let nextId = saved.length + 1;
  let nextCopyId = 1;

  return [
    http.get(`${V1}/saved-lists`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const sourceType = params.get('sourceType');
      const matching = sourceType
        ? saved.filter(fromSource(sourceType, params.get('sourceId')))
        : saved;
      const latestFirst = [...matching].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return HttpResponse.json({ items: latestFirst.map(mockSavedSummary) });
    }),
    http.post(`${V1}/saved-lists`, async ({ request }) => {
      const body = (await request.json()) as Schemas['SaveListRequest'];
      const existing = saved.find(fromSource(body.sourceType, body.sourceId));
      if (existing) return HttpResponse.json(mockSavedSummary(existing), { status: 200 });
      const source = catalog.find(fromSource(body.sourceType, body.sourceId));
      const list = withSavedDefaults({
        name: body.sourceId,
        ...source,
        id: `s${nextId++}`,
        sourceType: body.sourceType as MockSavedList['sourceType'],
        sourceId: body.sourceId,
        createdAt: '2026-11-13T00:00:00Z',
      });
      saved.push(list);
      return HttpResponse.json(mockSavedSummary(list), { status: 201 });
    }),
    http.get(`${V1}/saved-lists/:id`, ({ params }) => {
      const list = find(params.id);
      if (!list) return mockListError(404, 'saved_list_not_found');
      return HttpResponse.json(mockSavedDetail(list));
    }),
    http.delete(`${V1}/saved-lists/:id`, ({ params }) => {
      const list = find(params.id);
      if (!list) return mockListError(404, 'saved_list_not_found');
      saved.splice(saved.indexOf(list), 1);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${V1}/saved-lists/:id/copy`, async ({ params, request }) => {
      const list = find(params.id);
      if (!list) return mockListError(404, 'saved_list_not_found');
      if (!list.copyAvailable) return mockListError(409, 'saved_list_copy_unavailable');
      const { name } = (await request.json()) as Schemas['CopySavedListRequest'];
      const copy: Schemas['MovieListResponse'] = {
        id: `copy${nextCopyId++}`,
        name: name.trim(),
        description: null,
        createdAt: MOCK_LIST_DATE,
        updatedAt: MOCK_LIST_DATE,
        items: list.items.map((item) => ({ ...item, createdAt: list.createdAt })),
      };
      return HttpResponse.json(copy, { status: 201 });
    }),
  ];
}

export interface MockPublicList {
  id: string;
  name: string;
  description?: string | null;
  items?: MockListItem[];
  createdAt?: string;
  updatedAt?: string;
  memberCount?: number;
  viewerRole?: 'owner' | 'member' | null;
}

function publicWatchedCount(items: MockListItem[], viewerSignedIn: boolean): number | null {
  return viewerSignedIn ? items.filter((item) => item.isWatched).length : null;
}

export function createPublicListsHandlers(
  creator: MockListCreator,
  lists: MockPublicList[],
  options: { viewerSignedIn?: boolean; profileFound?: boolean } = {}
) {
  const viewerSignedIn = options.viewerSignedIn ?? true;
  const route = `${V1}/users/${creator.handle}/lists`;
  const find = (id: unknown) => lists.find((list) => list.id === id);
  let nextCopyId = 1;
  return [
    http.get(route, () => {
      if (options.profileFound === false) return mockListError(404, 'profile_not_found');
      const body: Schemas['PublicListsResponse'] = {
        items: lists.map((list) => {
          const items = list.items ?? [];
          return {
            id: list.id,
            name: list.name,
            description: list.description ?? null,
            itemCount: items.length,
            posterPaths: items.flatMap((item) => (item.posterPath ? [item.posterPath] : [])),
            createdAt: list.createdAt ?? MOCK_LIST_DATE,
            updatedAt: list.updatedAt ?? MOCK_LIST_DATE,
            memberCount: list.memberCount ?? 1,
            watchedCount: publicWatchedCount(items, viewerSignedIn),
          };
        }),
      };
      return HttpResponse.json(body);
    }),
    http.get(`${route}/:listId`, ({ params }) => {
      const list = find(params.listId);
      if (!list) return mockListError(404, 'list_not_found');
      const items = list.items ?? [];
      const body: Schemas['PublicListResponse'] = {
        id: list.id,
        name: list.name,
        description: list.description ?? null,
        createdAt: list.createdAt ?? MOCK_LIST_DATE,
        updatedAt: list.updatedAt ?? MOCK_LIST_DATE,
        itemCount: items.length,
        memberCount: list.memberCount ?? 1,
        watchedCount: publicWatchedCount(items, viewerSignedIn),
        creator,
        viewerRole: list.viewerRole ?? undefined,
        items: items.map((item) => ({ ...item, createdAt: item.createdAt ?? MOCK_LIST_DATE })),
      };
      return HttpResponse.json(body);
    }),
    http.post(`${route}/:listId/copy`, async ({ params, request }) => {
      const list = find(params.listId);
      if (!list) return mockListError(404, 'list_not_found');
      if (list.viewerRole) return mockListError(409, 'list_already_yours');
      const { name } = (await request.json()) as Schemas['CopySavedListRequest'];
      const copy: Schemas['MovieListResponse'] = {
        id: `publicCopy${nextCopyId++}`,
        name: name.trim(),
        description: list.description ?? null,
        createdAt: MOCK_LIST_DATE,
        updatedAt: MOCK_LIST_DATE,
        items: (list.items ?? []).map((item) => ({ ...item, createdAt: MOCK_LIST_DATE })),
      };
      return HttpResponse.json(copy, { status: 201 });
    }),
  ];
}

export interface MockWatchedMovie {
  tmdbId: number;
  mediaType?: 'movie' | 'tv';
  title: string;
  year?: string;
  posterPath?: string | null;
  genreIds?: number[];
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  watchedAt?: string;
  myRating?: number | null;
  source: 'night' | 'elsewhere';
  nightSlug?: string | null;
  nightTitle?: string | null;
}

type StoredWatchedMovie = MockWatchedMovie &
  Required<Pick<MockWatchedMovie, 'mediaType' | 'year' | 'watchedAt'>>;

const MOCK_WATCHED_DATE = '2026-11-01T20:00:00Z';

function mockWatchedStatus(film: StoredWatchedMovie | undefined) {
  const status: Schemas['WatchedStatusResponse'] = film
    ? {
        status: film.source,
        watchedAt: film.watchedAt,
        rating: film.myRating ?? null,
        nightSlug: film.source === 'night' ? (film.nightSlug ?? null) : null,
        nightTitle: film.source === 'night' ? (film.nightTitle ?? null) : null,
      }
    : { status: 'none', watchedAt: null, rating: null, nightSlug: null, nightTitle: null };
  return status;
}

function mockWatchedItem(film: StoredWatchedMovie) {
  const item: Schemas['UserWatchedMovieItem'] = {
    tmdbId: film.tmdbId,
    mediaType: film.mediaType,
    title: film.title,
    year: film.year,
    posterPath: film.posterPath ?? null,
    genreIds: film.genreIds ?? [],
    voteAverage: film.voteAverage ?? null,
    runtimeMinutes: film.runtimeMinutes ?? null,
    watchedAt: film.watchedAt,
    myRating: film.myRating ?? null,
    source: film.source,
  };
  return item;
}

function mockTitleRef(tmdbId: unknown, request: Request) {
  return {
    tmdbId: Number(tmdbId),
    mediaType: (new URL(request.url).searchParams.get('mediaType') ?? 'movie') as 'movie' | 'tv',
  };
}

export function createWatchedHandlers(initial: MockWatchedMovie[] = []) {
  const films: StoredWatchedMovie[] = initial.map((film) => ({
    mediaType: 'movie',
    year: '2020',
    watchedAt: MOCK_WATCHED_DATE,
    ...film,
  }));
  const find = (ref: { tmdbId: number; mediaType?: string }) =>
    films.find(
      (film) => film.tmdbId === ref.tmdbId && film.mediaType === (ref.mediaType ?? 'movie')
    );

  return [
    http.get(`${V1}/users/me/watched-movies`, () => {
      const latestFirst = [...films].sort((a, b) => b.watchedAt.localeCompare(a.watchedAt));
      return HttpResponse.json({ items: latestFirst.map(mockWatchedItem), total: films.length });
    }),
    http.get(`${V1}/watched/:tmdbId`, ({ params, request }) =>
      HttpResponse.json(mockWatchedStatus(find(mockTitleRef(params.tmdbId, request))))
    ),
    http.post(`${V1}/watched`, async ({ request }) => {
      const body = (await request.json()) as Schemas['MarkWatchedRequest'];
      if (!find(body)) {
        films.push({
          ...body,
          mediaType: body.mediaType ?? 'movie',
          year: body.year ?? '',
          genreIds: body.genreIds ?? [],
          myRating: body.rating ?? null,
          watchedAt: MOCK_WATCHED_DATE,
          source: 'elsewhere',
        });
      }
      return HttpResponse.json(mockWatchedStatus(find(body)));
    }),
    http.put(`${V1}/watched/:tmdbId/rating`, async ({ params, request }) => {
      const film = find(mockTitleRef(params.tmdbId, request));
      if (film?.source !== 'elsewhere') return mockListError(404, 'watched_title_not_found');
      const { value } = (await request.json()) as Schemas['SetWatchedRatingRequest'];
      if (value != null && (value < 1 || value > 10)) {
        return mockListError(400, 'validation_failed');
      }
      film.myRating = value ?? null;
      return HttpResponse.json(mockWatchedStatus(film));
    }),
    http.delete(`${V1}/watched/:tmdbId`, ({ params, request }) => {
      const film = find(mockTitleRef(params.tmdbId, request));
      if (film?.source === 'elsewhere') films.splice(films.indexOf(film), 1);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

export interface MockEventOptions {
  slug: string;
  title?: string;
  isFinished?: boolean;
  lifecycle?: string;
  winnerCount?: number;

  theme?: string | null;
}

export function createEventDetailHandlers(opts: MockEventOptions) {
  const title = opts.title ?? 'Soirée MSW';
  const slug = opts.slug;

  return [
    http.get(`${V1}/events/slug/${slug}`, ({ request }) => {
      const host = request.headers.get('X-Host-Token');
      const body: EventDetailPayload = {
        _id: 'evt-msw',
        title,
        date: '2030-12-15',
        time: '21:00',
        slug,
        isHost: !!host,
        isFinished: opts.isFinished ?? false,
        lifecycle: opts.lifecycle ?? (opts.isFinished ? 'finished' : 'live'),
        winners: [],
        participantCount: 4,
        movieCount: 2,
        participants: [
          { _id: 'p-msw-host', pseudo: 'Hôte', isCreator: true },
          { _id: 'p-msw-alice', pseudo: 'Alice' },
          { _id: 'p-msw-bob', pseudo: 'Bob' },
          { _id: 'p-msw-chloe', pseudo: 'Chloé' },
        ],
        config: {
          theme: opts.theme ?? null,
          maxProposalsPerParticipant: null,
          maxParticipants: null,
          maxVotesPerParticipant: null,
          wheelMode: 'strictRandom',
          winnerCount: opts.winnerCount ?? 1,
        },
      };
      return HttpResponse.json(body);
    }),
    http.get(`${V1}/events/${slug}/movies`, () =>
      HttpResponse.json([] satisfies Schemas['MovieWithScoreResponse'][])
    ),
  ];
}

export function createJoinHandler(slug: string) {
  return http.post(`${V1}/events/${slug}/join`, async () => {
    const body: Schemas['JoinEventResult'] = {
      participant: { _id: 'p-msw-1', eventId: 'evt-msw', pseudo: 'Alice' },
      isNew: true,
      message: '',
    };
    return HttpResponse.json(body, { status: 201 });
  });
}

export interface MockUserStats {
  eventsCreated?: number;
  eventsJoined?: number;
  moviesProposed?: number;
  votesCast?: number;
  winningProposals?: number;
  moviesSeen?: number;
  publicListCount?: number;
  currentStreakWeeks?: number;
  bestStreakWeeks?: number;
  favoriteGenres?: Schemas['GenreCount'][];
  dailyActivity?: Schemas['DailyActivityPoint'][];
}

export function createUserStatsHandler(handle: string, stats?: MockUserStats) {
  return http.get(`${V1}/users/${handle}/stats`, () => {
    const body: Schemas['UserStatsResponse'] = {
      eventsCreated: stats?.eventsCreated ?? 0,
      eventsJoined: stats?.eventsJoined ?? 0,
      moviesProposed: stats?.moviesProposed ?? 0,
      votesCast: stats?.votesCast ?? 0,
      winningProposals: stats?.winningProposals ?? 0,
      moviesSeen: stats?.moviesSeen ?? 0,
      publicListCount: stats?.publicListCount ?? 0,
      currentStreakWeeks: stats?.currentStreakWeeks ?? 0,
      bestStreakWeeks: stats?.bestStreakWeeks ?? 0,
      favoriteGenres: stats?.favoriteGenres ?? [],
      dailyActivity: stats?.dailyActivity ?? [],
    };
    return HttpResponse.json(body);
  });
}

export function createSearchAndAddHandlers(slug: string) {
  return [
    http.get(`${V1}/movies/search`, () => {
      const body: Schemas['MovieSearchListResponse'] = {
        items: [
          {
            id: 100,
            title: 'Film Test',
            year: '2024',
            posterPath: null,
            voteAverage: 7.5,
            runtimeMinutes: 112,
            watchProviders: [
              { providerId: 8, name: 'Netflix MSW', logoPath: null, type: 'flatrate' },
            ],
            tmdbWatchPageUrl: 'https://www.themoviedb.org/movie/100/watch',
          },
        ],
        watchProvidersRegion: 'FR',
        disclaimer:
          'Les notes et les offres de visionnage (streaming / VOD) sont indicatives, issues de The Movie Database (TMDB). Les services disponibles peuvent varier.',
        tmdbAttributionUrl: 'https://www.themoviedb.org/',
      };
      return HttpResponse.json(body);
    }),
    http.post(`${V1}/events/${slug}/movies`, async () => {
      const body: Schemas['MovieWithScoreResponse'] = { _id: 'm-new', title: 'Film Test' };
      return HttpResponse.json(body, { status: 201 });
    }),
  ];
}

import { http, HttpResponse } from 'msw';
import { apiErrorJson, apiJson, type ApiSchemas as Schemas } from './apiJson';

export const TEST_API_BASE = 'http://127.0.0.1:3999';

export const TEST_API_V1 = `${TEST_API_BASE}/api/v1`;

const V1 = TEST_API_V1;

const MOCK_DATE = '2026-11-01T00:00:00Z';

export const authMeGuestHandler = http.get(`${V1}/auth/me`, () =>
  apiJson<'ApiErrorResponse'>(
    { error: 'Authentication required', code: 401, reason: 'unauthorized' },
    { status: 401 }
  )
);

type MockTitle<T extends { tmdbId: number; title: string }> = Pick<T, 'tmdbId' | 'title'> &
  Partial<T>;

export type MockWatchlistItem = MockTitle<Schemas['WatchlistItemResponse']>;

function mockWatchlistItem(item: MockWatchlistItem): Schemas['WatchlistItemResponse'] {
  return {
    mediaType: 'movie',
    year: '',
    genreIds: [],
    createdAt: MOCK_DATE,
    onLetterboxd: false,
    posterPath: null,
    voteAverage: null,
    runtimeMinutes: null,
    ...item,
  };
}

export function createWatchlistHandlers(
  items: MockWatchlistItem[],
  availability: Schemas['WatchlistAvailabilityItemResponse'][] = []
) {
  return [
    http.get(`${V1}/watchlist`, () =>
      apiJson<'WatchlistResponse'>({
        items: items.map(mockWatchlistItem),
        total: items.length,
        hasMore: false,
      })
    ),
    http.get(`${V1}/watchlist/availability`, () =>
      apiJson<'WatchlistAvailabilityResponse'>({ items: availability, partial: false })
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

const EMPTY_LETTERBOXD_CONFIRM: Schemas['LetterboxdImportConfirmResponse'] = {
  added: 0,
  alreadyPresent: 0,
  watchedAdded: 0,
  watchedAlreadyPresent: 0,
  pendingReconciliationCount: 0,
};

export function createLetterboxdSyncHandler(
  report: Partial<Schemas['LetterboxdSyncResponse']> = {}
) {
  return http.post(`${V1}/letterboxd/sync`, () =>
    apiJson<'LetterboxdSyncResponse'>({ ...EMPTY_LETTERBOXD_SYNC, ...report })
  );
}

export function createLetterboxdConfirmHandler(
  onConfirm: (body: Schemas['LetterboxdImportConfirmRequest']) => void = () => undefined,
  result: Partial<Schemas['LetterboxdImportConfirmResponse']> = {}
) {
  return http.post(`${V1}/letterboxd/confirm`, async ({ request }) => {
    onConfirm((await request.json()) as Schemas['LetterboxdImportConfirmRequest']);
    return apiJson<'LetterboxdImportConfirmResponse'>({ ...EMPTY_LETTERBOXD_CONFIRM, ...result });
  });
}

type WithShorthandAvatar<T extends { avatarId: string }> = Omit<T, 'avatarId'> & {
  avatarId: string | null;
};

export type MockListPerson = WithShorthandAvatar<Required<Schemas['MovieListPersonResponse']>>;

function servedAvatar<T extends { avatarId: string | null }>(person: T) {
  return { ...person, avatarId: person.avatarId ?? '' };
}

interface MockListItem extends Omit<MockTitle<Schemas['MovieListItemResponse']>, 'addedBy'> {
  addedBy?: MockListPerson;
}

function mockListItem(
  item: MockListItem,
  createdAt = item.createdAt ?? MOCK_DATE
): Schemas['MovieListItemResponse'] {
  const { addedBy, ...title } = item;
  return {
    mediaType: 'movie',
    year: '',
    genreIds: [],
    isWatched: false,
    posterPath: null,
    voteAverage: null,
    runtimeMinutes: null,
    ...title,
    createdAt,
    addedBy: addedBy ? servedAvatar(addedBy) : null,
  };
}

function storedItem(request: Schemas['AddWatchlistItemRequest']): MockListItem {
  return { ...request, genreIds: request.genreIds ?? undefined, createdAt: MOCK_DATE };
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
  role?: Schemas['MovieListRole'];
  owner?: MockListPerson;
  memberCount?: number;
  memberPreview?: MockListPerson[];
  isPublic?: boolean;
}

type StoredList = Required<MockList>;

function sameMockItem(a: Pick<MockListItem, 'tmdbId' | 'mediaType'>, b: MockListItem): boolean {
  return a.tmdbId === b.tmdbId && (a.mediaType ?? 'movie') === (b.mediaType ?? 'movie');
}

function mockListAudience(list: StoredList) {
  return {
    role: list.role,
    owner: servedAvatar(list.owner),
    memberCount: list.memberCount,
    memberPreview: list.memberPreview.map(servedAvatar),
  };
}

function posterPreview(items: MockListItem[]): string[] {
  return items.flatMap((item) => (item.posterPath ? [item.posterPath] : [])).slice(0, 3);
}

function mockListSummary(
  list: StoredList,
  containing?: Pick<MockListItem, 'tmdbId' | 'mediaType'> | null
): Schemas['MovieListSummaryResponse'] {
  return {
    ...mockListAudience(list),
    id: list.id,
    name: list.name,
    description: list.description,
    isPublic: list.isPublic,
    itemCount: list.items.length,
    posterPaths: posterPreview(list.items),
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    containsMovie: !!containing && list.items.some((item) => sameMockItem(containing, item)),
    watchedCount: list.items.filter((item) => item.isWatched).length,
  };
}

function mockListDetail(list: StoredList): Schemas['MovieListResponse'] {
  const { id, name, description, isPublic, createdAt, updatedAt, items } = list;
  return {
    ...mockListAudience(list),
    id,
    name,
    description,
    isPublic,
    createdAt,
    updatedAt,
    items: items.map((item) => mockListItem(item)),
  };
}

function withListDefaults(list: MockList): StoredList {
  const owner = list.owner ?? MOCK_LIST_OWNER;
  return {
    description: null,
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
    role: 'owner',
    memberCount: 1,
    memberPreview: [owner],
    isPublic: false,
    ...list,
    owner,
    items: [...(list.items ?? [])],
  };
}

function mediaTypeOf(request: Request): Schemas['MovieMediaType'] {
  return new URL(request.url).searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie';
}

export function createListsHandlers(initial: MockList[] = []) {
  const lists: StoredList[] = initial.map(withListDefaults);
  const find = (id: unknown) => lists.find((list) => list.id === id);
  let nextId = lists.length + 1;

  return [
    http.get(`${V1}/lists`, ({ request }) => {
      const tmdbId = Number(new URL(request.url).searchParams.get('tmdbId'));
      const containing = tmdbId ? { tmdbId, mediaType: mediaTypeOf(request) } : null;
      return apiJson<'MovieListsResponse'>({
        items: lists.map((list) => mockListSummary(list, containing)),
      });
    }),
    http.post(`${V1}/lists`, async ({ request }) => {
      const body = (await request.json()) as Schemas['CreateMovieListRequest'];
      const list = withListDefaults({
        id: `l${nextId++}`,
        name: body.name,
        description: body.description ?? null,
        isPublic: body.isPublic ?? false,
        items: body.firstItem ? [storedItem(body.firstItem)] : [],
      });
      lists.push(list);
      return apiJson<'MovieListSummaryResponse'>(mockListSummary(list), { status: 201 });
    }),
    http.get(`${V1}/lists/:id`, ({ params }) => {
      const list = find(params.id);
      if (!list) return apiErrorJson(404, 'list_not_found');
      return apiJson<'MovieListResponse'>(mockListDetail(list));
    }),
    http.patch(`${V1}/lists/:id`, async ({ params, request }) => {
      const list = find(params.id);
      if (!list) return apiErrorJson(404, 'list_not_found');
      const body = (await request.json()) as Schemas['UpdateMovieListRequest'];
      list.name = body.name;
      list.description = body.description ?? null;
      list.isPublic = body.isPublic ?? list.isPublic;
      return apiJson<'MovieListSummaryResponse'>(mockListSummary(list));
    }),
    http.delete(`${V1}/lists/:id`, ({ params }) => {
      const list = find(params.id);
      if (!list) return apiErrorJson(404, 'list_not_found');
      lists.splice(lists.indexOf(list), 1);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${V1}/lists/:id/items`, async ({ params, request }) => {
      const list = find(params.id);
      if (!list) return apiErrorJson(404, 'list_not_found');
      const item = storedItem((await request.json()) as Schemas['AddWatchlistItemRequest']);
      const existing = list.items.find((stored) => sameMockItem(item, stored));
      if (existing) return apiJson<'MovieListItemResponse'>(mockListItem(existing));
      list.items.push(item);
      return apiJson<'MovieListItemResponse'>(mockListItem(item), { status: 201 });
    }),
    http.delete(`${V1}/lists/:id/items/:tmdbId`, ({ params, request }) => {
      const list = find(params.id);
      if (!list) return apiErrorJson(404, 'list_not_found');
      const target = { tmdbId: Number(params.tmdbId), mediaType: mediaTypeOf(request) };
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

const MOCK_MAX_MEMBERS = 20;

const MOCK_INVITE_LINK_EXPIRY = '2099-01-01T00:00:00Z';

function invitationOf(person: MockListPerson): Schemas['MovieListPendingInvitationResponse'] {
  const { userId, handle, displayName, avatarId } = person;
  return servedAvatar({ userId, handle, displayName, avatarId, invitedAt: MOCK_DATE });
}

export function createListMembershipHandlers(listId: string, initial: MockListMembership) {
  const state = {
    maxMembers: initial.maxMembers ?? MOCK_MAX_MEMBERS,
    members: initial.members.map((member) =>
      servedAvatar({ isOwner: false, joinedAt: MOCK_DATE, ...member })
    ),
    invitations:
      initial.invitations === null ? null : (initial.invitations ?? []).map(invitationOf),
    inviteLink: initial.inviteLink ?? null,
    invitable: [...(initial.invitable ?? [])],
  };
  const route = `${V1}/lists/${listId}`;

  return [
    http.get(`${route}/members`, () =>
      apiJson<'MovieListMembersResponse'>({
        maxMembers: state.maxMembers,
        members: state.members,
        invitations: state.invitations,
        inviteLink: state.inviteLink,
      })
    ),
    http.get(`${route}/invitable`, () =>
      apiJson<'MovieListInvitableUsersResponse'>({
        users: state.invitable.map((person) => ({
          ...servedAvatar(person),
          handle: person.handle ?? '',
        })),
      })
    ),
    http.post(`${route}/invitations`, async ({ request }) => {
      const { userId } = (await request.json()) as Schemas['InviteToMovieListRequest'];
      const person = state.invitable.find((candidate) => candidate.userId === userId) ?? {
        userId,
        handle: null,
        displayName: userId,
        avatarId: null,
      };
      const invitation = invitationOf(person);
      state.invitable = state.invitable.filter((candidate) => candidate.userId !== userId);
      state.invitations = [...(state.invitations ?? []), invitation];
      return apiJson<'MovieListPendingInvitationResponse'>(invitation, { status: 201 });
    }),
    http.delete(`${route}/invitations/:userId`, ({ params }) => {
      const invitation = state.invitations?.find((person) => person.userId === params.userId);
      if (!invitation) return apiErrorJson(404, 'list_invitation_not_found');
      state.invitations = (state.invitations ?? []).filter((person) => person !== invitation);
      const { userId, handle, displayName, avatarId } = invitation;
      state.invitable = [
        ...state.invitable,
        { userId, handle: handle ?? null, displayName, avatarId },
      ];
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
        expiresAt: MOCK_INVITE_LINK_EXPIRY,
        active: true,
      };
      return apiJson<'MovieListInviteLinkResponse'>(state.inviteLink);
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
  joined: MockList = { id: 'joined-list', name: preview?.name ?? '' }
) {
  const route = `${V1}/lists/join/${token}`;
  return [
    http.get(route, () =>
      preview
        ? apiJson<'MovieListInvitePreviewResponse'>(preview)
        : apiErrorJson(404, 'list_invite_link_invalid')
    ),
    http.post(route, () =>
      preview
        ? apiJson<'MovieListSummaryResponse'>(
            mockListSummary(withListDefaults({ role: 'member', ...joined })),
            {
              status: 201,
            }
          )
        : apiErrorJson(404, 'list_invite_link_invalid')
    ),
  ];
}

export type MockListCreator = WithShorthandAvatar<Schemas['ListCreatorResponse']>;

export interface MockSavedList {
  id: string;
  sourceType: Schemas['ListSourceType'];
  sourceId: string;
  name: string | null;
  description?: string | null;
  creator?: MockListCreator | null;
  items?: MockListItem[];
  createdAt?: string;
  unavailable?: boolean;
  unavailableReason?: Schemas['ListSourceUnavailableReason'] | null;
  copyAvailable?: boolean;
}

type StoredSavedList = Required<MockSavedList>;

function withSavedDefaults(list: MockSavedList): StoredSavedList {
  return {
    items: [],
    createdAt: MOCK_DATE,
    description: null,
    creator: null,
    unavailable: false,
    unavailableReason: null,
    copyAvailable: !list.unavailable,
    ...list,
  };
}

function mockSavedSummary(list: StoredSavedList): Schemas['SavedListSummaryResponse'] {
  const items = list.unavailable ? [] : list.items;
  return {
    id: list.id,
    sourceType: list.sourceType,
    sourceId: list.sourceId,
    name: list.name,
    description: list.description,
    creator: list.creator ? servedAvatar(list.creator) : null,
    itemCount: items.length,
    posterPaths: posterPreview(items),
    watchedCount: items.filter((item) => item.isWatched).length,
    createdAt: list.createdAt,
    unavailable: list.unavailable,
    unavailableReason: list.unavailableReason ?? null,
    copyAvailable: list.copyAvailable,
  };
}

function mockSavedDetail(list: StoredSavedList): Schemas['SavedListResponse'] {
  const items = list.unavailable ? [] : list.items;
  return {
    ...mockSavedSummary(list),
    items: items.map((item) => mockListItem(item, list.createdAt)),
  };
}

interface MockCopy {
  id: string;
  name: string;
  description: string | null;
  items: MockListItem[];
  itemsCreatedAt: string;
}

function copiedList({ id, name, description, items, itemsCreatedAt }: MockCopy) {
  return apiJson<'MovieListResponse'>(
    mockListDetail(
      withListDefaults({
        id,
        name,
        description,
        items: items.map((item) => ({ ...item, createdAt: itemsCreatedAt })),
      })
    ),
    { status: 201 }
  );
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
      return apiJson<'SavedListsResponse'>({ items: latestFirst.map(mockSavedSummary) });
    }),
    http.post(`${V1}/saved-lists`, async ({ request }) => {
      const body = (await request.json()) as Schemas['SaveListRequest'];
      const existing = saved.find(fromSource(body.sourceType, body.sourceId));
      if (existing) return apiJson<'SavedListSummaryResponse'>(mockSavedSummary(existing));
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
      return apiJson<'SavedListSummaryResponse'>(mockSavedSummary(list), { status: 201 });
    }),
    http.get(`${V1}/saved-lists/:id`, ({ params }) => {
      const list = find(params.id);
      if (!list) return apiErrorJson(404, 'saved_list_not_found');
      return apiJson<'SavedListResponse'>(mockSavedDetail(list));
    }),
    http.delete(`${V1}/saved-lists/:id`, ({ params }) => {
      const list = find(params.id);
      if (!list) return apiErrorJson(404, 'saved_list_not_found');
      saved.splice(saved.indexOf(list), 1);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${V1}/saved-lists/:id/copy`, async ({ params, request }) => {
      const list = find(params.id);
      if (!list) return apiErrorJson(404, 'saved_list_not_found');
      const { name } = (await request.json()) as Schemas['CopySavedListRequest'];
      return copiedList({
        id: `copy${nextCopyId++}`,
        name,
        description: null,
        items: list.items,
        itemsCreatedAt: list.createdAt,
      });
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
  viewerRole?: Schemas['MovieListRole'] | null;
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
      if (options.profileFound === false) return apiErrorJson(404, 'profile_not_found');
      return apiJson<'PublicListsResponse'>({
        items: lists.map((list) => {
          const items = list.items ?? [];
          return {
            id: list.id,
            name: list.name,
            description: list.description ?? null,
            itemCount: items.length,
            posterPaths: items.flatMap((item) => (item.posterPath ? [item.posterPath] : [])),
            createdAt: list.createdAt ?? MOCK_DATE,
            updatedAt: list.updatedAt ?? MOCK_DATE,
            memberCount: list.memberCount ?? 1,
            watchedCount: publicWatchedCount(items, viewerSignedIn),
          };
        }),
      });
    }),
    http.get(`${route}/:listId`, ({ params }) => {
      const list = find(params.listId);
      if (!list) return apiErrorJson(404, 'list_not_found');
      const items = list.items ?? [];
      return apiJson<'PublicListResponse'>({
        id: list.id,
        name: list.name,
        description: list.description ?? null,
        createdAt: list.createdAt ?? MOCK_DATE,
        updatedAt: list.updatedAt ?? MOCK_DATE,
        itemCount: items.length,
        memberCount: list.memberCount ?? 1,
        watchedCount: publicWatchedCount(items, viewerSignedIn),
        creator: servedAvatar(creator),
        viewerRole: list.viewerRole ?? null,
        items: items.map((item) => mockListItem(item)),
      });
    }),
    http.post(`${route}/:listId/copy`, async ({ params, request }) => {
      const list = find(params.listId);
      if (!list) return apiErrorJson(404, 'list_not_found');
      const { name } = (await request.json()) as Schemas['CopySavedListRequest'];
      return copiedList({
        id: `publicCopy${nextCopyId++}`,
        name,
        description: list.description ?? null,
        items: list.items ?? [],
        itemsCreatedAt: MOCK_DATE,
      });
    }),
  ];
}

export interface MockWatchedMovie extends Omit<
  MockTitle<Schemas['UserWatchedMovieItem']>,
  'source'
> {
  source: Schemas['WatchedSource'];
  nightSlug?: string | null;
  nightTitle?: string | null;
}

type StoredWatchedMovie = MockWatchedMovie &
  Required<Pick<MockWatchedMovie, 'mediaType' | 'year' | 'watchedAt'>>;

const MOCK_WATCHED_DATE = '2026-11-01T20:00:00Z';

function mockWatchedStatus(film: StoredWatchedMovie | undefined): Schemas['WatchedStatusResponse'] {
  return film
    ? {
        status: film.source,
        watchedAt: film.watchedAt,
        rating: film.myRating ?? null,
        nightSlug: film.source === 'night' ? (film.nightSlug ?? null) : null,
        nightTitle: film.source === 'night' ? (film.nightTitle ?? null) : null,
      }
    : { status: 'none', watchedAt: null, rating: null, nightSlug: null, nightTitle: null };
}

function mockWatchedItem(film: StoredWatchedMovie): Schemas['UserWatchedMovieItem'] {
  return {
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
}

function mockTitleRef(tmdbId: unknown, request: Request) {
  return { tmdbId: Number(tmdbId), mediaType: mediaTypeOf(request) };
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
      return apiJson<'UserWatchedMoviesResponse'>({
        items: latestFirst.map(mockWatchedItem),
        total: films.length,
      });
    }),
    http.get(`${V1}/watched/:tmdbId`, ({ params, request }) =>
      apiJson<'WatchedStatusResponse'>(
        mockWatchedStatus(find(mockTitleRef(params.tmdbId, request)))
      )
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
      return apiJson<'WatchedStatusResponse'>(mockWatchedStatus(find(body)));
    }),
    http.put(`${V1}/watched/:tmdbId/rating`, async ({ params, request }) => {
      const film = find(mockTitleRef(params.tmdbId, request));
      if (film?.source !== 'elsewhere') return apiErrorJson(404, 'watched_title_not_found');
      const { value } = (await request.json()) as Schemas['SetWatchedRatingRequest'];
      film.myRating = value ?? null;
      return apiJson<'WatchedStatusResponse'>(mockWatchedStatus(film));
    }),
    http.delete(`${V1}/watched/:tmdbId`, ({ params, request }) => {
      const film = find(mockTitleRef(params.tmdbId, request));
      if (film?.source === 'elsewhere') films.splice(films.indexOf(film), 1);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

export type MockProposedMovie = MockTitle<Schemas['UserProposedMovieItem']>;

function mockProposedMovie(item: MockProposedMovie): Schemas['UserProposedMovieItem'] {
  return {
    mediaType: 'movie',
    year: '2020',
    posterPath: null,
    voteAverage: null,
    runtimeMinutes: null,
    genreIds: [],
    lastProposedAt: MOCK_DATE,
    proposalCount: 1,
    ...item,
  };
}

export function createMyProposedMoviesHandlers(
  proposed: MockProposedMovie[] = [],
  winning: MockProposedMovie[] = []
) {
  return [
    http.get(`${V1}/users/me/proposed-movies`, ({ request }) => {
      const winningOnly = new URL(request.url).searchParams.get('winningOnly') === 'true';
      return apiJson<'UserProposedMoviesResponse'>({
        items: (winningOnly ? winning : proposed).map(mockProposedMovie),
      });
    }),
  ];
}

export type MockNightMovie = MockTitle<Schemas['MyNightMovieItem']>;

function mockNightMovieItem(film: MockNightMovie): Schemas['MyNightMovieItem'] {
  return {
    mediaType: 'movie',
    year: '2020',
    posterPath: null,
    genreIds: [],
    voteAverage: null,
    runtimeMinutes: null,
    lastProposedAt: MOCK_DATE,
    proposedByMe: false,
    isWinner: false,
    isWatched: false,
    lastProposer: null,
    ...film,
  };
}

export function createNightMoviesHandlers(films: MockNightMovie[] = []) {
  return [
    http.get(`${V1}/users/me/night-movies`, () =>
      apiJson<'MyNightMoviesResponse'>({ items: films.map(mockNightMovieItem) })
    ),
  ];
}

export interface MockEventOptions {
  slug: string;
  title?: string;
  isFinished?: boolean;
  lifecycle?: Schemas['EventDetailResponse']['lifecycle'];
  winnerCount?: number;

  theme?: string | null;
}

function mockParticipant(_id: string, pseudo: string, isCreator = false) {
  return { _id, pseudo, isCreator, avatarId: '', handle: null, accentColor: null };
}

export function createEventDetailHandlers(opts: MockEventOptions) {
  const title = opts.title ?? 'Soirée MSW';
  const slug = opts.slug;

  return [
    http.get(`${V1}/events/slug/${slug}`, ({ request }) => {
      const host = request.headers.get('X-Host-Token');
      return apiJson<'EventDetailResponse'>({
        _id: 'evt-msw',
        title,
        date: '2030-12-15',
        time: '21:00',
        slug,
        recapSlug: null,
        closedAt: null,
        myParticipant: null,
        createdAt: MOCK_DATE,
        updatedAt: MOCK_DATE,
        isHost: !!host,
        isFinished: opts.isFinished ?? false,
        lifecycle: opts.lifecycle ?? (opts.isFinished ? 'finished' : 'live'),
        winners: [],
        participantCount: 4,
        movieCount: 2,
        votersCount: 0,
        participants: [
          mockParticipant('p-msw-host', 'Hôte', true),
          mockParticipant('p-msw-alice', 'Alice'),
          mockParticipant('p-msw-bob', 'Bob'),
          mockParticipant('p-msw-chloe', 'Chloé'),
        ],
        config: {
          theme: opts.theme ?? null,
          maxProposalsPerParticipant: null,
          maxParticipants: null,
          maxVotesPerParticipant: null,
          wheelMode: 'strictRandom',
          themeColor: null,
          recurrence: null,
          winnerCount: opts.winnerCount ?? 1,
          richSharePreview: false,
          allowSeries: false,
          hasNextOccurrence: false,
          groupId: null,
        },
      });
    }),
    http.get(`${V1}/events/${slug}/movies`, () => apiJson<'MovieWithScoreResponse[]'>([])),
    http.put(`${V1}/events/${slug}/presence`, () => new HttpResponse(null, { status: 204 })),
  ];
}

export function createJoinHandler(slug: string) {
  return http.post(`${V1}/events/${slug}/join`, async () =>
    apiJson<'JoinEventResult'>(
      {
        participant: {
          _id: 'p-msw-1',
          eventId: 'evt-msw',
          pseudo: 'Alice',
          createdAt: MOCK_DATE,
          updatedAt: MOCK_DATE,
        },
        isNew: true,
        message: '',
      },
      { status: 201 }
    )
  );
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
  return http.get(`${V1}/users/${handle}/stats`, () =>
    apiJson<'UserStatsResponse'>({
      eventsCreated: stats?.eventsCreated ?? 0,
      eventsJoined: stats?.eventsJoined ?? 0,
      moviesProposed: stats?.moviesProposed ?? 0,
      votesCast: stats?.votesCast ?? 0,
      winningProposals: stats?.winningProposals ?? 0,
      proposalsAverageRating: null,
      moviesSeen: stats?.moviesSeen ?? 0,
      publicListCount: stats?.publicListCount ?? 0,
      currentStreakWeeks: stats?.currentStreakWeeks ?? 0,
      bestStreakWeeks: stats?.bestStreakWeeks ?? 0,
      favoriteGenres: stats?.favoriteGenres ?? [],
      dailyActivity: stats?.dailyActivity ?? [],
    })
  );
}

export function createSearchAndAddHandlers(slug: string) {
  return [
    http.get(`${V1}/movies/search`, () =>
      apiJson<'MovieSearchListResponse'>({
        items: [
          {
            id: 100,
            mediaType: 'movie',
            title: 'Film Test',
            year: '2024',
            posterPath: null,
            genreIds: [],
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
      })
    ),
    http.post(`${V1}/events/${slug}/movies`, async () =>
      apiJson<'MovieWithScoreResponse'>(
        {
          _id: 'm-new',
          eventId: 'evt-msw',
          participantId: 'p-msw-1',
          tmdbId: 100,
          mediaType: 'movie',
          title: 'Film Test',
          year: '2024',
          genreIds: [],
          excludedFromWheel: false,
          createdAt: MOCK_DATE,
          updatedAt: MOCK_DATE,
          proposerPseudo: 'Alice',
          proposerHandle: null,
          posterPath: null,
          pitchNote: null,
          myVote: null,
          voteAverage: null,
          tmdbWatchPageUrl: null,
          runtimeMinutes: null,
          releaseDate: null,
          score: 0,
          up: 0,
          down: 0,
          seenCount: 0,
          seenByPseudos: [],
          votersUpPseudos: [],
          ratings: [],
          watchProviders: [],
        },
        { status: 201 }
      )
    ),
  ];
}

export interface MockGroupMember extends MockListPerson {
  role?: Schemas['FriendGroupRole'];
}

export interface MockGroup {
  id: string;
  name: string;
  role?: Schemas['FriendGroupRole'];
  owner?: MockListPerson;
  members?: MockGroupMember[];
  upcomingNights?: Schemas['MyEventSummaryDto'][];
  nextNightParticipantIds?: string[];
  pastNights?: Schemas['MyEventSummaryDto'][];
  createdAt?: string;
  ranking?: Schemas['FriendGroupRankingResponse'];
}

type StoredGroup = Required<MockGroup>;

export interface MockGroupInvitation {
  groupId: string;
  name: string;
  invitedByDisplayName: string;
  members?: MockListPerson[];
}

const MOCK_GROUP_PREVIEW_SIZE = 4;

function withGroupDefaults(group: MockGroup): StoredGroup {
  const owner = group.owner ?? MOCK_LIST_OWNER;
  return {
    role: 'owner',
    upcomingNights: [],
    nextNightParticipantIds: [],
    pastNights: [],
    createdAt: MOCK_DATE,
    ranking: { nightCount: 0, members: [] },
    ...group,
    owner,
    members: group.members ?? [{ ...owner, role: 'owner' }],
  };
}

function groupPerson(person: MockListPerson): Schemas['FriendGroupPersonResponse'] {
  const { userId, displayName, avatarId } = servedAvatar(person);
  return { userId, displayName, avatarId };
}

function mockGroupSummary(group: StoredGroup): Schemas['FriendGroupSummaryResponse'] {
  return {
    id: group.id,
    name: group.name,
    role: group.role,
    ownerId: group.owner.userId,
    ownerDisplayName: group.owner.displayName,
    memberCount: group.members.length,
    memberPreview: group.members.slice(0, MOCK_GROUP_PREVIEW_SIZE).map(groupPerson),
    createdAt: group.createdAt,
    updatedAt: group.createdAt,
  };
}

function mockGroupMember(member: MockGroupMember): Schemas['FriendGroupMemberResponse'] {
  const { userId, handle, displayName, avatarId } = servedAvatar(member);
  return {
    userId,
    handle,
    displayName,
    avatarId,
    role: member.role ?? 'member',
    joinedAt: MOCK_DATE,
  };
}

function mockGroupDetail(group: StoredGroup): Schemas['FriendGroupDetailResponse'] {
  return {
    ...mockGroupSummary(group),
    members: group.members.map(mockGroupMember),
    upcomingNights: group.upcomingNights,
    nextNightParticipantIds: group.nextNightParticipantIds,
    pastNights: group.pastNights,
  };
}

function mockGroupInvitation(
  invitation: MockGroupInvitation
): Schemas['FriendGroupInvitationResponse'] {
  const members = invitation.members ?? [];
  return {
    groupId: invitation.groupId,
    name: invitation.name,
    invitedByDisplayName: invitation.invitedByDisplayName,
    memberCount: members.length,
    memberPreview: members.slice(0, MOCK_GROUP_PREVIEW_SIZE).map(groupPerson),
    invitedAt: MOCK_DATE,
  };
}

export function createGroupsHandlers(
  initial: MockGroup[] = [],
  initialInvitations: MockGroupInvitation[] = []
) {
  let groups = initial.map(withGroupDefaults);
  let invitations = [...initialInvitations];
  const route = `${V1}/groups`;
  const find = (id: unknown) => groups.find((group) => group.id === id);
  const notFound = () => apiErrorJson(404, 'group_not_found');

  return [
    http.get(route, () =>
      apiJson<'MyGroupsResponse'>({
        groups: groups.map(mockGroupSummary),
        invitations: invitations.map(mockGroupInvitation),
        nextNights: groups.flatMap((group) => group.upcomingNights.slice(0, 1)),
      })
    ),
    http.post(route, async ({ request }) => {
      const { name } = (await request.json()) as Schemas['CreateFriendGroupRequest'];
      const created = withGroupDefaults({ id: `g${groups.length + 1}`, name });
      groups = [...groups, created];
      return apiJson<'FriendGroupSummaryResponse'>(mockGroupSummary(created), { status: 201 });
    }),
    http.get(`${route}/:id`, ({ params }) => {
      const group = find(params.id);
      return group ? apiJson<'FriendGroupDetailResponse'>(mockGroupDetail(group)) : notFound();
    }),
    http.get(`${route}/:id/ranking`, ({ params }) => {
      const group = find(params.id);
      return group ? apiJson<'FriendGroupRankingResponse'>(group.ranking) : notFound();
    }),
    http.patch(`${route}/:id`, async ({ params, request }) => {
      const group = find(params.id);
      if (!group) return notFound();
      const { name } = (await request.json()) as Schemas['UpdateFriendGroupRequest'];
      group.name = name;
      return apiJson<'FriendGroupSummaryResponse'>(mockGroupSummary(group));
    }),
    http.delete(`${route}/:id`, ({ params }) => {
      groups = groups.filter((group) => group.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${route}/:id/leave`, ({ params }) => {
      groups = groups.filter((group) => group.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${route}/:id/invitation/accept`, ({ params }) => {
      const invitation = invitations.find((candidate) => candidate.groupId === params.id);
      if (!invitation) return apiErrorJson(404, 'group_invitation_not_found');
      invitations = invitations.filter((candidate) => candidate !== invitation);
      const joined = withGroupDefaults({
        id: invitation.groupId,
        name: invitation.name,
        role: 'member',
        members: invitation.members,
      });
      groups = [...groups, joined];
      return apiJson<'FriendGroupSummaryResponse'>(mockGroupSummary(joined));
    }),
    http.post(`${route}/:id/invitation/decline`, ({ params }) => {
      invitations = invitations.filter((candidate) => candidate.groupId !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

export interface MockGroupMembership {
  maxMembers?: number;
  members: MockGroupMember[];
  invitations?: MockListPerson[] | null;
  inviteLink?: Schemas['FriendGroupInviteLinkResponse'] | null;
  invitable?: MockListPerson[];
}

function groupInvitationOf(
  person: MockListPerson
): Schemas['FriendGroupPendingInvitationResponse'] {
  const { userId, handle, displayName, avatarId } = servedAvatar(person);
  return { userId, handle, displayName, avatarId, invitedAt: MOCK_DATE };
}

export function createGroupMembershipHandlers(groupId: string, initial: MockGroupMembership) {
  const state = {
    maxMembers: initial.maxMembers ?? MOCK_MAX_MEMBERS,
    members: initial.members.map(mockGroupMember),
    invitations:
      initial.invitations === null ? null : (initial.invitations ?? []).map(groupInvitationOf),
    inviteLink: initial.inviteLink ?? null,
    invitable: [...(initial.invitable ?? [])],
  };
  const route = `${V1}/groups/${groupId}`;

  return [
    http.get(`${route}/members`, () =>
      apiJson<'FriendGroupMembersResponse'>({
        maxMembers: state.maxMembers,
        members: state.members,
        invitations: state.invitations,
        inviteLink: state.inviteLink,
      })
    ),
    http.get(`${route}/invitable`, () =>
      apiJson<'FriendGroupInvitableUsersResponse'>({
        users: state.invitable.map((person) => ({
          ...servedAvatar(person),
          handle: person.handle ?? '',
        })),
      })
    ),
    http.post(`${route}/invitations`, async ({ request }) => {
      const { userId } = (await request.json()) as Schemas['InviteToFriendGroupRequest'];
      const person = state.invitable.find((candidate) => candidate.userId === userId) ?? {
        userId,
        handle: null,
        displayName: userId,
        avatarId: null,
      };
      const invitation = groupInvitationOf(person);
      state.invitable = state.invitable.filter((candidate) => candidate.userId !== userId);
      state.invitations = [...(state.invitations ?? []), invitation];
      return apiJson<'FriendGroupPendingInvitationResponse'>(invitation, { status: 201 });
    }),
    http.delete(`${route}/invitations/:userId`, ({ params }) => {
      const invitation = state.invitations?.find((person) => person.userId === params.userId);
      if (!invitation) return apiErrorJson(404, 'group_invitation_not_found');
      state.invitations = (state.invitations ?? []).filter((person) => person !== invitation);
      state.invitable = [...state.invitable, invitation];
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(`${route}/members/:userId`, ({ params }) => {
      state.members = state.members.filter((member) => member.userId !== params.userId);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${route}/invite-link`, () => {
      state.inviteLink = {
        token: 'nouveau-lien',
        expiresAt: MOCK_INVITE_LINK_EXPIRY,
        active: true,
      };
      return apiJson<'FriendGroupInviteLinkResponse'>(state.inviteLink);
    }),
    http.delete(`${route}/invite-link`, () => {
      state.inviteLink = state.inviteLink ? { ...state.inviteLink, active: false } : null;
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

export function createGroupJoinHandlers(
  token: string,
  preview: Schemas['FriendGroupInvitePreviewResponse'] | null,
  joined: MockGroup = { id: 'joined-group', name: preview?.name ?? '' }
) {
  const route = `${V1}/groups/join/${token}`;
  return [
    http.get(route, () =>
      preview
        ? apiJson<'FriendGroupInvitePreviewResponse'>(preview)
        : apiErrorJson(404, 'group_invite_link_invalid')
    ),
    http.post(route, () =>
      preview
        ? apiJson<'FriendGroupJoinResponse'>(
            {
              group: mockGroupSummary(withGroupDefaults({ role: 'member', ...joined })),
              joined: true,
            },
            { status: 201 }
          )
        : apiErrorJson(404, 'group_invite_link_invalid')
    ),
  ];
}

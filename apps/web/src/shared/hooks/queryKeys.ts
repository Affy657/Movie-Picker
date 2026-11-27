export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
    sessions: ['auth', 'sessions'] as const,
  },
  profile: {
    publicAll: ['profile', 'public'] as const,
    public: (handle: string | undefined) => ['profile', 'public', handle ?? '$pending'] as const,
    followingAll: ['profile', 'following'] as const,
    following: (handle: string | undefined) =>
      ['profile', 'following', handle ?? '$pending'] as const,
    followersAll: ['profile', 'followers'] as const,
    followers: (handle: string | undefined) =>
      ['profile', 'followers', handle ?? '$pending'] as const,
    statsAll: ['profile', 'stats'] as const,
    stats: (handle: string | undefined) => ['profile', 'stats', handle ?? '$pending'] as const,
    userSearches: ['profile', 'user-search'] as const,
    userSearch: (query: string) => ['profile', 'user-search', query] as const,
    bannerBackdrops: (tmdbId: number) => ['profile', 'banner-backdrops', tmdbId] as const,
    bannerSearch: (query: string, lang: string) =>
      ['profile', 'banner-search', query, lang] as const,
    watchedMoviesAll: ['profile', 'watchedMovies'] as const,
    watchedMovies: (handle: string | undefined, take: number) =>
      ['profile', 'watchedMovies', handle ?? '$pending', take] as const,
    proposedMovies: (handle: string | undefined, winningOnly: boolean) =>
      ['profile', 'proposedMovies', handle ?? '$pending', winningOnly] as const,
    watchlistAll: ['profile', 'watchlist'] as const,
    watchlistOf: (handle: string) => ['profile', 'watchlist', handle] as const,
    watchlist: (handle: string | undefined, take: number) =>
      ['profile', 'watchlist', handle ?? '$pending', take] as const,
  },
  notifications: {
    inbox: ['notifications', 'inbox'] as const,
    inboxPaged: ['notifications', 'inbox', 'paged'] as const,
    unreadCount: ['notifications', 'inbox', 'unread-count'] as const,
  },
  myEvents: {
    list: ['events', 'mine'] as const,
    active: ['events', 'mine', 'active'] as const,
    finished: (q: string) => ['events', 'mine', 'finished', q] as const,
    lastHosted: ['events', 'mine', 'last-hosted'] as const,
    nightMovies: ['events', 'mine', 'night-movies'] as const,
  },
  eventTemplates: {
    list: ['event-templates', 'list'] as const,
  },
  eventLimits: ['event-limits'] as const,
  event: {
    all: ['event'] as const,

    detail: (slug: string | undefined) => ['event', 'detail', slug ?? '$pending'] as const,

    recap: (recapSlug: string | undefined) => ['event', 'recap', recapSlug ?? '$pending'] as const,

    eligibleFollowsAll: ['event', 'eligible-follows'] as const,

    eligibleFollows: (slug: string | undefined) =>
      ['event', 'eligible-follows', slug ?? '$pending'] as const,

    reusableConfig: (slug: string | undefined) =>
      ['event', 'reusable-config', slug ?? '$pending'] as const,
  },
  movies: {
    all: ['movies'] as const,
    list: (slug: string | undefined) => ['movies', 'list', slug ?? '$pending'] as const,
    details: (tmdbId: number | undefined, mediaType?: string) =>
      ['movies', 'details', tmdbId ?? '$pending', mediaType ?? 'movie'] as const,
    nights: (tmdbId: number, mediaType: string) => ['movies', 'nights', tmdbId, mediaType] as const,
    collections: ['movies', 'collections'] as const,
    showcaseThemes: ['movies', 'showcase', 'themes'] as const,
    searchPage: (query: string) => ['movies', 'search-page', query] as const,
    searchIdle: ['movies', 'search', '$idle'] as const,
    search: (
      searchKey: string,
      lang: string,
      eventSlug: string | undefined,
      includeSeries: boolean
    ) => ['movies', 'search', searchKey, lang, eventSlug ?? '', includeSeries] as const,
  },
  me: {
    followingWatchedMoviesAll: ['users', 'me', 'following-watched-movies'] as const,
    followingWatchedMovies: (take: number) =>
      ['users', 'me', 'following-watched-movies', take] as const,
    proposedMoviesAll: ['users', 'me', 'proposed-movies'] as const,
    proposedMovies: (winningOnly: boolean) =>
      ['users', 'me', 'proposed-movies', winningOnly] as const,
  },
  watched: {
    all: ['watched'] as const,
    movies: ['watched', 'movies'] as const,
    latest: (take: number) => ['watched', 'latest', take] as const,
    status: (tmdbId: number, mediaType: string) =>
      ['watched', 'status', tmdbId, mediaType] as const,
  },
  watchlist: {
    list: ['watchlist', 'list'] as const,
    availability: ['watchlist', 'availability'] as const,
  },
  groups: {
    all: ['groups'] as const,
    mine: ['groups', 'mine'] as const,
    detail: (id: string) => ['groups', 'detail', id] as const,
    ranking: (id: string) => ['groups', 'ranking', id] as const,
    members: (id: string) => ['groups', 'members', id] as const,
    invitable: (id: string) => ['groups', 'invitable', id] as const,
    invitePreview: (token: string, viewerId: string | null) =>
      ['groups', 'invite', token, viewerId ?? '$anonymous'] as const,
  },
  lists: {
    all: ['lists'] as const,
    mine: ['lists', 'mine'] as const,
    containingAll: ['lists', 'containing'] as const,
    containing: (tmdbId: number, mediaType: string) =>
      ['lists', 'containing', tmdbId, mediaType] as const,
    detail: (id: string | undefined) => ['lists', 'detail', id ?? '$pending'] as const,
    members: (id: string) => ['lists', 'members', id] as const,
    invitable: (id: string) => ['lists', 'invitable', id] as const,
    invitePreview: (token: string, viewerId: string | null) =>
      ['lists', 'invite', token, viewerId ?? '$anonymous'] as const,
    savedAll: ['lists', 'saved'] as const,
    savedMine: ['lists', 'saved', 'mine'] as const,
    savedBySource: (sourceType: string, sourceId: string) =>
      ['lists', 'saved', 'source', sourceType, sourceId] as const,
    savedDetail: (id: string | undefined) =>
      ['lists', 'saved', 'detail', id ?? '$pending'] as const,
    publicOf: (handle: string | undefined) =>
      ['lists', 'public', handle ?? '$pending', 'summaries'] as const,
    publicDetail: (handle: string | undefined, listId: string | undefined) =>
      ['lists', 'public', handle ?? '$pending', 'detail', listId ?? '$pending'] as const,
  },
  globalSearch: {
    results: (viewerId: string | null, query: string) =>
      ['global-search', viewerId ?? '$guest', query] as const,
  },
} as const;

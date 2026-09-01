export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  profile: {
    public: (handle: string | undefined) => ['profile', 'public', handle ?? '$pending'] as const,
    handleAvailability: (handle: string) => ['profile', 'handle-available', handle] as const,
    following: (handle: string | undefined) =>
      ['profile', 'following', handle ?? '$pending'] as const,
    followers: (handle: string | undefined) =>
      ['profile', 'followers', handle ?? '$pending'] as const,
    stats: (handle: string | undefined) => ['profile', 'stats', handle ?? '$pending'] as const,
    watchedMovies: (handle: string | undefined, take: number) =>
      ['profile', 'watchedMovies', handle ?? '$pending', take] as const,
  },
  notifications: {
    inbox: ['notifications', 'inbox'] as const,
    inboxPaged: ['notifications', 'inbox', 'paged'] as const,
  },
  myEvents: {
    list: ['events', 'mine'] as const,
    active: ['events', 'mine', 'active'] as const,
    finished: (q: string) => ['events', 'mine', 'finished', q] as const,
  },
  event: {
    all: ['event'] as const,

    detail: (slug: string | undefined, hostToken: string | null) =>
      ['event', 'detail', slug ?? '$pending', hostToken ?? ''] as const,

    eligibleFollows: (slug: string | undefined) =>
      ['event', 'eligible-follows', slug ?? '$pending'] as const,
  },
  movies: {
    all: ['movies'] as const,
    list: (slug: string | undefined) => ['movies', 'list', slug ?? '$pending'] as const,
    details: (tmdbId: number | undefined, mediaType?: string) =>
      ['movies', 'details', tmdbId ?? '$pending', mediaType ?? 'movie'] as const,
  },
  watchlist: {
    list: ['watchlist', 'list'] as const,
  },
} as const;

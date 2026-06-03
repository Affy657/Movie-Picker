export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  profile: {
    public: (handle: string | undefined) => ['profile', 'public', handle ?? '$pending'] as const,
    handleAvailability: (handle: string) => ['profile', 'handle-available', handle] as const,
    following: (handle: string | undefined) => ['profile', 'following', handle ?? '$pending'] as const,
    followers: (handle: string | undefined) => ['profile', 'followers', handle ?? '$pending'] as const,
  },
  notifications: {
    inbox: ['notifications', 'inbox'] as const,
  },
  myEvents: {
    list: ['events', 'mine'] as const,
    listPaged: ['events', 'mine', 'paged'] as const,
  },
  event: {
    all: ['event'] as const,

    detail: (slug: string | undefined, hostToken: string | null) =>
      ['event', 'detail', slug ?? '$pending', hostToken ?? ''] as const,
  },
  movies: {
    all: ['movies'] as const,
    list: (slug: string | undefined) => ['movies', 'list', slug ?? '$pending'] as const,
    details: (tmdbId: number | undefined, mediaType?: string) =>
      ['movies', 'details', tmdbId ?? '$pending', mediaType ?? 'movie'] as const,
  },
} as const;

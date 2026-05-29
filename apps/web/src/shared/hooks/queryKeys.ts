export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
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

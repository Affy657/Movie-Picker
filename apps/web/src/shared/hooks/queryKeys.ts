/** Clés React Query centralisées (invalidation, tests). */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  myEvents: {
    list: ['events', 'mine'] as const,
    guestJoined: ['events', 'guest-joined'] as const,
  },
  event: {
    all: ['event'] as const,
    /** `$pending` quand `slug` absent (query désactivée) — évite une clé vide ambiguë. */
    detail: (slug: string | undefined, hostToken: string | null) =>
      ['event', 'detail', slug ?? '$pending', hostToken ?? ''] as const,
  },
  movies: {
    all: ['movies'] as const,
    list: (slug: string | undefined) => ['movies', 'list', slug ?? '$pending'] as const,
    details: (tmdbId: number | undefined) => ['movies', 'details', tmdbId ?? '$pending'] as const,
  },
} as const;

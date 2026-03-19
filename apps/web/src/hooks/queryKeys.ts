/** Clés React Query centralisées (invalidation, tests). */
export const queryKeys = {
  event: {
    all: ['event'] as const,
    detail: (slug: string, hostToken: string | null) =>
      ['event', 'detail', slug, hostToken ?? ''] as const,
  },
  movies: {
    all: ['movies'] as const,
    list: (slug: string) => ['movies', 'list', slug] as const,
  },
} as const;

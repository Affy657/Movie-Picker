export const API_ERROR_REASONS = {
  voteLimitReached: 'vote-limit-reached',
  invalidResetToken: 'invalid_reset_token',
  letterboxdWatchlistIncomplete: 'letterboxd_watchlist_incomplete',
} as const;

export class ApiError extends Error {
  readonly code?: number;

  readonly reason?: string;

  constructor(message: string, options?: { code?: number; reason?: string; cause?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ApiError';
    this.code = options?.code;
    this.reason = options?.reason;
  }

  static is(e: unknown): e is ApiError {
    return e instanceof ApiError;
  }
}

export function getErrorMessage(e: unknown, fallback = 'Une erreur est survenue.'): string {
  if (ApiError.is(e)) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

/**
 * Erreur API typée (roadmap § 25) — message affichable + code HTTP optionnel pour « Réessayer » / analytics.
 */
export class ApiError extends Error {
  readonly code?: number;

  constructor(message: string, options?: { code?: number; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'ApiError';
    this.code = options?.code;
  }

  static is(e: unknown): e is ApiError {
    return e instanceof ApiError;
  }
}

/** Message utilisateur à partir d’une erreur inconnue (fetch, React Query, etc.). */
export function getErrorMessage(e: unknown, fallback = 'Une erreur est survenue.'): string {
  if (ApiError.is(e)) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

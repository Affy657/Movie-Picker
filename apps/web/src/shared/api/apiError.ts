export class ApiError extends Error {
  readonly code?: number;

  constructor(message: string, options?: { code?: number; cause?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ApiError';
    this.code = options?.code;
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

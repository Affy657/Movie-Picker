import { ApiError, getErrorMessage } from '@/shared/api/apiError';

export function friendlyEventError(err: unknown): string {
  if (ApiError.is(err)) {
    if (err.code === 404 || /introuvable|404/i.test(err.message)) {
      return "Cette soirée n'existe pas ou a été supprimée.";
    }
    return err.message;
  }
  return getErrorMessage(err);
}

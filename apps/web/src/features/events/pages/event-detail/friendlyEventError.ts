import { ApiError, getErrorMessage } from '@/shared/api/apiError';

type FriendlyEventErrorMessages = {
  notFound: string;
  fallback: string;
};

export function friendlyEventError(err: unknown, messages: FriendlyEventErrorMessages): string {
  if (ApiError.is(err)) {
    if (err.code === 404 || /introuvable|404|not found/i.test(err.message)) {
      return messages.notFound;
    }
    return err.message;
  }
  return getErrorMessage(err, messages.fallback);
}

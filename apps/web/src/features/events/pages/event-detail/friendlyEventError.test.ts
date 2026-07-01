import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api/apiError';
import { friendlyEventError } from '@/features/events/pages/event-detail/friendlyEventError';

const NOT_FOUND = "Cette soirée n'existe pas ou a été supprimée.";

describe('friendlyEventError', () => {
  it('maps a 404 ApiError to the missing-event message', () => {
    expect(friendlyEventError(new ApiError('Not found', { code: 404 }))).toBe(NOT_FOUND);
  });

  it('maps an "introuvable" message to the missing-event message', () => {
    expect(friendlyEventError(new ApiError('Ressource introuvable', { code: 400 }))).toBe(
      NOT_FOUND
    );
  });

  it('maps a message mentioning 404 to the missing-event message', () => {
    expect(friendlyEventError(new ApiError('Erreur 404 côté serveur', { code: 500 }))).toBe(
      NOT_FOUND
    );
  });

  it('returns the ApiError message for other API errors', () => {
    expect(friendlyEventError(new ApiError('Trop de requêtes', { code: 429 }))).toBe(
      'Trop de requêtes'
    );
  });

  it('delegates plain errors to getErrorMessage', () => {
    expect(friendlyEventError(new Error('boom'))).toBe('boom');
  });

  it('falls back to a generic message for unknown values', () => {
    expect(friendlyEventError('weird')).toBe('Une erreur est survenue.');
  });
});

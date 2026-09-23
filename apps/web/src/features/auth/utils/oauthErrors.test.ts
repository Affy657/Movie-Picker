import { describe, expect, it } from 'vitest';
import { resolveOAuthErrorKey } from '@/features/auth/utils/oauthErrors';

describe('resolveOAuthErrorKey', () => {
  it('explains why linking a second account of the same provider is refused', () => {
    expect(resolveOAuthErrorKey('provider_already_linked')).toBe(
      'auth.oauth.errors.providerAlreadyLinked'
    );
  });

  it('asks for a fresh sign-in before linking an account', () => {
    expect(resolveOAuthErrorKey('reauthentication_required')).toBe(
      'auth.oauth.errors.reauthenticationRequired'
    );
  });

  it('falls back to the generic message for an unknown code, and to nothing without code', () => {
    expect(resolveOAuthErrorKey('something_else')).toBe('auth.oauth.errors.generic');
    expect(resolveOAuthErrorKey(null)).toBeNull();
  });
});

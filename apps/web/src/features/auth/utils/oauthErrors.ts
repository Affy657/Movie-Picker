import type { TranslationKey } from '@/shared/i18n';

const OAUTH_ERROR_KEYS: Record<string, TranslationKey> = {
  provider_disabled: 'auth.oauth.errors.providerDisabled',
  external_auth_failed: 'auth.oauth.errors.externalAuthFailed',
  provider_error: 'auth.oauth.errors.providerError',
  email_not_verified: 'auth.oauth.errors.emailNotVerified',
  identity_taken: 'auth.oauth.errors.identityTaken',
};

export function resolveOAuthErrorKey(code: string | null): TranslationKey | null {
  if (!code) return null;
  return OAUTH_ERROR_KEYS[code] ?? 'auth.oauth.errors.generic';
}

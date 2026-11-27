import { fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';
import { setSessionHint } from '@/features/auth/session-hint';

export type TwoFactorSetup = ApiSchemas['TwoFactorSetupResponse'];
export type TwoFactorSignIn = ApiSchemas['TwoFactorLoginResponse'];

export async function postTwoFactorVerify(code: string): Promise<TwoFactorSignIn> {
  const result = await fetchApi<TwoFactorSignIn>('/auth/two-factor/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  setSessionHint();
  return result;
}

export function postTwoFactorSetup(): Promise<TwoFactorSetup> {
  return fetchApi<TwoFactorSetup>('/auth/me/two-factor/setup', { method: 'POST' });
}

export async function postTwoFactorEnable(request: {
  setupToken: string;
  code: string;
  currentPassword?: string;
}): Promise<string[]> {
  const result = await fetchApi<ApiSchemas['TwoFactorBackupCodesResponse']>('/auth/me/two-factor', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return result.backupCodes;
}

export async function deleteTwoFactor(code: string): Promise<void> {
  await fetchApi('/auth/me/two-factor', { method: 'DELETE', body: JSON.stringify({ code }) });
}

export async function postTwoFactorBackupCodes(code: string): Promise<string[]> {
  const result = await fetchApi<ApiSchemas['TwoFactorBackupCodesResponse']>(
    '/auth/me/two-factor/backup-codes',
    { method: 'POST', body: JSON.stringify({ code }) }
  );
  return result.backupCodes;
}

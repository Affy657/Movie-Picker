import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deleteTwoFactor,
  postTwoFactorBackupCodes,
  postTwoFactorEnable,
  postTwoFactorSetup,
  postTwoFactorVerify,
} from '@/features/auth/api/twoFactorApi';
import { clearSessionHint, hasSessionHint } from '@/features/auth/session-hint';

const mockFetchApi = vi.fn();
vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));

function lastCall(): { path: string; method?: string; body?: unknown } {
  const [path, init] = mockFetchApi.mock.calls.at(-1) as [
    string,
    { method?: string; body?: string },
  ];
  return { path, method: init.method, body: init.body ? JSON.parse(init.body) : undefined };
}

describe('twoFactorApi', () => {
  beforeEach(() => {
    mockFetchApi.mockReset();
    clearSessionHint();
  });

  it('sends the code of a pending sign-in and keeps the new session', async () => {
    mockFetchApi.mockResolvedValue({
      userId: 'u1',
      displayName: 'Léa',
      method: 'form',
      usedBackupCode: false,
      backupCodesRemaining: 10,
    });

    const result = await postTwoFactorVerify('123456');

    expect(lastCall()).toEqual({
      path: '/auth/two-factor/verify',
      method: 'POST',
      body: { code: '123456' },
    });
    expect(result.method).toBe('form');
    expect(hasSessionHint()).toBe(true);
  });

  it('asks for a new key without a body', async () => {
    mockFetchApi.mockResolvedValue({
      manualKey: 'K',
      otpauthUri: 'otpauth://totp/x',
      setupToken: 'T',
    });

    await postTwoFactorSetup();

    expect(lastCall()).toEqual({
      path: '/auth/me/two-factor/setup',
      method: 'POST',
      body: undefined,
    });
  });

  it('turns the setting on and hands back the backup codes', async () => {
    mockFetchApi.mockResolvedValue({ backupCodes: ['AAAA-BBBB'] });

    const codes = await postTwoFactorEnable({
      setupToken: 'T',
      code: '123456',
      currentPassword: 'p',
    });

    expect(codes).toEqual(['AAAA-BBBB']);
    expect(lastCall()).toEqual({
      path: '/auth/me/two-factor',
      method: 'POST',
      body: { setupToken: 'T', code: '123456', currentPassword: 'p' },
    });
  });

  it('turns the setting off with a code', async () => {
    mockFetchApi.mockResolvedValue(undefined);

    await deleteTwoFactor('AAAA-BBBB');

    expect(lastCall()).toEqual({
      path: '/auth/me/two-factor',
      method: 'DELETE',
      body: { code: 'AAAA-BBBB' },
    });
  });

  it('replaces the backup codes with a code', async () => {
    mockFetchApi.mockResolvedValue({ backupCodes: ['CCCC-DDDD'] });

    await expect(postTwoFactorBackupCodes('123456')).resolves.toEqual(['CCCC-DDDD']);
    expect(lastCall().path).toBe('/auth/me/two-factor/backup-codes');
  });
});

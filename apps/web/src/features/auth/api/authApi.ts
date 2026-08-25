import { apiUrl, fetchApi } from '@/shared/api/client';
import { ApiError } from '@/shared/api/apiError';
import type { AccentColor, RatingScale, UiThemePreference } from '@/shared/types/theme';
import type { UserProfile } from '@/features/auth/types';
import { clearSessionHint, hasSessionHint, setSessionHint } from '@/features/auth/session-hint';

export async function fetchAuthMeForSession(): Promise<UserProfile | null> {
  if (!hasSessionHint()) return null;
  try {
    const profile = await fetchAuthProfile();
    if (profile) setSessionHint();
    return profile ?? null;
  } catch (e) {
    if (ApiError.is(e) && e.code === 401) {
      clearSessionHint();
      return null;
    }
    throw e;
  }
}

export async function fetchAuthProfile(): Promise<UserProfile> {
  const profile = await fetchApi<UserProfile>('/auth/me');
  return {
    ...profile,
    hasPassword: profile.hasPassword ?? true,
    linkedProviders: profile.linkedProviders ?? [],
    letterboxdPendingReconciliationCount: profile.letterboxdPendingReconciliationCount ?? 0,
  };
}

export async function postAuthLogin(email: string, password: string): Promise<void> {
  await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setSessionHint();
}

export async function postAuthRegister(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  await fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  setSessionHint();
}

export async function postAuthLogout(): Promise<void> {
  try {
    await fetchApi('/auth/logout', { method: 'POST' });
  } finally {
    clearSessionHint();
  }
}

export async function fetchOAuthProviders(): Promise<string[]> {
  const res = await fetchApi<{ providers: string[] }>('/auth/oauth/providers');
  return res.providers;
}

export function oauthStartUrl(provider: string, returnTo: string): string {
  return apiUrl(`/auth/oauth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`);
}

export async function unlinkOAuthProvider(provider: string): Promise<void> {
  await fetchApi(`/auth/me/identities/${provider}`, { method: 'DELETE' });
}

export interface ProfilePatch {
  displayName?: string;
  uiTheme?: UiThemePreference;
  accentColor?: AccentColor;
  ratingScale?: RatingScale;
  avatarId?: string;
  handle?: string;
  bio?: string | null;
  isProfilePublic?: boolean;
  letterboxdUsername?: string | null;
}

export async function patchAuthProfile(patch: ProfilePatch): Promise<UserProfile> {
  const profile = await fetchApi<UserProfile>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return {
    ...profile,
    hasPassword: profile.hasPassword ?? true,
    linkedProviders: profile.linkedProviders ?? [],
    letterboxdPendingReconciliationCount: profile.letterboxdPendingReconciliationCount ?? 0,
  };
}

export async function patchChangePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await fetchApi('/auth/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function postPasswordResetRequest(email: string, locale: string): Promise<void> {
  await fetchApi('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email, locale }),
  });
}

export interface PasswordResetConfirmResponse {
  message: string;
}

export async function postPasswordResetConfirm(
  token: string,
  newPassword: string
): Promise<PasswordResetConfirmResponse> {
  return fetchApi<PasswordResetConfirmResponse>('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

function buildExportFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `movie-picker-mes-donnees-${date}.json`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function downloadMyDataExport(): Promise<void> {
  const data = await fetchApi<unknown>('/auth/me/export');
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerBlobDownload(blob, buildExportFilename());
}

export async function deleteAccount(payload: {
  password?: string;
  confirmation?: string;
}): Promise<void> {
  await fetchApi('/auth/me', {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
  clearSessionHint();
}

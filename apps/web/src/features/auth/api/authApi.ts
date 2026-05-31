import { fetchApi } from '@/shared/api/client';
import { ApiError } from '@/shared/api/apiError';
import type { AccentColor, UiThemePreference } from '@/shared/types/theme';
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
  return fetchApi<UserProfile>('/auth/me');
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

export interface ProfilePatch {
  displayName?: string;
  uiTheme?: UiThemePreference;
  accentColor?: AccentColor;
  avatarId?: string;
  handle?: string;
  bio?: string | null;
  isProfilePublic?: boolean;
}

export async function patchAuthProfile(patch: ProfilePatch): Promise<UserProfile> {
  return fetchApi<UserProfile>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
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

import { fetchApi } from '@/shared/api/client';
import { ApiError } from '@/shared/api/apiError';
import type { UiThemePreference } from '@/shared/types/theme';
import type { UserProfile } from '@/features/auth/types';

/** Pour la query « session » : 401 → invité, sans lever. */
export async function fetchAuthMeForSession(): Promise<UserProfile | null> {
  try {
    const profile = await fetchAuthProfile();
    return profile ?? null;
  } catch (e) {
    if (ApiError.is(e) && e.code === 401) return null;
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
}

export async function postAuthLogout(): Promise<void> {
  await fetchApi('/auth/logout', { method: 'POST' });
}

export async function patchAuthProfile(patch: {
  displayName?: string;
  uiTheme?: UiThemePreference;
}): Promise<UserProfile> {
  return fetchApi<UserProfile>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

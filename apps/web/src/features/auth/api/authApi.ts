import { fetchApi } from '@/shared/api/client';
import { ApiError } from '@/shared/api/apiError';
import type { UiThemePreference } from '@/shared/types/theme';
import type { UserProfile } from '@/features/auth/types';
import { clearSessionHint, hasSessionHint, setSessionHint } from '@/features/auth/session-hint';

/**
 * Pour la query « session » : 401 → invité, sans lever. Si aucun indice de
 * session local (cf. `session-hint`), on ne tape pas `/auth/me` pour éviter
 * le 401 visible en console (Lighthouse `errors-in-console`).
 */
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

export async function patchAuthProfile(patch: {
  displayName?: string;
  uiTheme?: UiThemePreference;
}): Promise<UserProfile> {
  return fetchApi<UserProfile>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

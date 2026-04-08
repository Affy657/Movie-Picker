import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../api/client';
import { ApiError } from '../api/apiError';
import { queryKeys } from '../hooks/queryKeys';
import type { UiThemePreference, UserProfile } from '../types/auth';

async function fetchMe(): Promise<UserProfile | null> {
  try {
    const profile = await fetchApi<UserProfile>('/auth/me');
    return profile ?? null;
  } catch (e) {
    if (ApiError.is(e) && e.code === 401) return null;
    throw e;
  }
}

type AuthContextValue = {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  patchProfile: (patch: {
    displayName?: string;
    uiTheme?: UiThemePreference;
  }) => Promise<UserProfile>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user = null, isLoading } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });

  const invalidateSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await invalidateSession();
    },
    [invalidateSession]
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      await invalidateSession();
    },
    [invalidateSession]
  );

  const logout = useCallback(async () => {
    await fetchApi('/auth/logout', { method: 'POST' });
    queryClient.setQueryData(queryKeys.auth.me, null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
  }, [queryClient]);

  const patchProfile = useCallback(
    async (patch: { displayName?: string; uiTheme?: UiThemePreference }) => {
      const updated = await fetchApi<UserProfile>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      queryClient.setQueryData(queryKeys.auth.me, updated);
      return updated;
    },
    [queryClient]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      patchProfile,
    }),
    [user, isLoading, login, register, logout, patchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous AuthProvider');
  return ctx;
}

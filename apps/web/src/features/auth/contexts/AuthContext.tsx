import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAuthMeForSession,
  patchAuthProfile,
  postAuthLogin,
  postAuthLogout,
  postAuthRegister,
} from '@/features/auth/api/authApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { AccentColor, UiThemePreference } from '@/shared/types/theme';
import type { UserProfile } from '@/features/auth/types';

type AuthContextValue = {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  patchProfile: (patch: {
    displayName?: string;
    uiTheme?: UiThemePreference;
    accentColor?: AccentColor;
  }) => Promise<UserProfile>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const invalidateSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.guestJoined });
  }, [queryClient]);

  const { data: user = null, isLoading } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchAuthMeForSession,
    staleTime: 60_000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      await postAuthLogin(email, password);
      await invalidateSession();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      displayName,
    }: {
      email: string;
      password: string;
      displayName: string;
    }) => {
      await postAuthRegister(email, password, displayName);
      await invalidateSession();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await postAuthLogout();
      queryClient.setQueryData(queryKeys.auth.me, null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
      await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.guestJoined });
    },
  });

  const patchProfileMutation = useMutation({
    mutationFn: (patch: {
      displayName?: string;
      uiTheme?: UiThemePreference;
      accentColor?: AccentColor;
    }) => patchAuthProfile(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.auth.me, updated);
    },
  });

  const login = useCallback(
    (email: string, password: string) => loginMutation.mutateAsync({ email, password }),
    [loginMutation]
  );

  const register = useCallback(
    (email: string, password: string, displayName: string) =>
      registerMutation.mutateAsync({ email, password, displayName }),
    [registerMutation]
  );

  const logout = useCallback(() => logoutMutation.mutateAsync(), [logoutMutation]);

  const patchProfile = useCallback(
    (patch: { displayName?: string; uiTheme?: UiThemePreference; accentColor?: AccentColor }) =>
      patchProfileMutation.mutateAsync(patch),
    [patchProfileMutation]
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

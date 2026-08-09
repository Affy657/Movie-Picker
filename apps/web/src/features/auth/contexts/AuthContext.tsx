import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAuthMeForSession,
  patchAuthProfile,
  postAuthLogin,
  postAuthLogout,
  postAuthRegister,
  type ProfilePatch,
} from '@/features/auth/api/authApi';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import type { UserProfile } from '@/features/auth/types';

type AuthContextValue = {
  user: UserProfile | null;
  isLoading: boolean;
  authCheckFailed: boolean;
  retryAuthCheck: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  patchProfile: (patch: ProfilePatch) => Promise<UserProfile>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();

  const { track } = useAnalytics();

  const invalidateSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
  }, [queryClient]);

  const {
    data: user = null,
    isLoading,
    isError: authCheckFailed,
    refetch: refetchSession,
  } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchAuthMeForSession,
    staleTime: 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  });

  const retryAuthCheck = useCallback(() => {
    void refetchSession();
  }, [refetchSession]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      await postAuthLogin(email, password);
      await invalidateSession();
    },
    onSuccess: () => track('user_logged_in'),
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
    onSuccess: () => track('user_signed_up'),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await postAuthLogout();
      queryClient.setQueryData(queryKeys.auth.me, null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    },
    onSuccess: () => track('user_logged_out'),
  });

  const patchProfileMutation = useMutation({
    mutationFn: (patch: ProfilePatch) => patchAuthProfile(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.auth.me, updated);
      track('profile_updated');
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
    (patch: ProfilePatch) => patchProfileMutation.mutateAsync(patch),
    [patchProfileMutation]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      authCheckFailed,
      retryAuthCheck,
      login,
      register,
      logout,
      patchProfile,
    }),
    [user, isLoading, authCheckFailed, retryAuthCheck, login, register, logout, patchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous AuthProvider');
  return ctx;
}

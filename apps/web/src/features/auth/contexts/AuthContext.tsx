import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { hashKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAuthMeForSession,
  patchAuthProfile,
  postAuthLogin,
  postAuthLogout,
  postAuthRegister,
  type LoginResult,
  type ProfilePatch,
} from '@/features/auth/api/authApi';
import { postTwoFactorVerify, type TwoFactorSignIn } from '@/features/auth/api/twoFactorApi';
import {
  clearPendingSignOut,
  hasPendingSignOut,
  markSignOutPending,
  onSessionChangedInAnotherTab,
} from '@/features/auth/session-hint';
import { ApiError } from '@/shared/api/apiError';
import { onUnauthorizedResponse } from '@/shared/api/client';
import { clearStoredEventIdentities } from '@/shared/utils/eventIdentityStorage';
import { dropBrowserPushSubscription } from '@/shared/utils/browserPushSubscription';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { entryOriginOf } from '@/shared/analytics/entryOrigin';
import { applyUpdatedProfile } from '@/features/auth/utils/profileCache';
import { markWelcomePending } from '@/features/auth/welcome';
import type { UserProfile } from '@/features/auth/types';

type AuthContextValue = {
  user: UserProfile | null;
  isLoading: boolean;
  authCheckFailed: boolean;
  signOutPending: boolean;
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
  retryAuthCheck: () => void;
  login: (email: string, password: string, returnTo?: string) => Promise<LoginResult>;
  verifyTwoFactor: (code: string, returnTo?: string) => Promise<TwoFactorSignIn>;
  register: (
    email: string,
    password: string,
    displayName: string,
    returnTo?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  endSession: () => Promise<void>;
  patchProfile: (patch: ProfilePatch) => Promise<UserProfile>;
};

interface EmailSignIn {
  email: string;
  password: string;
  returnTo?: string;
}

interface TwoFactorCodeEntry {
  code: string;
  returnTo?: string;
}

interface EmailSignUp extends EmailSignIn {
  displayName: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function signedOutStateRendered(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const ANSWERS_A_SIGN_IN_FORM = /\/auth\/(login|register|logout|password-reset)(\/|$)/;

function sessionIsGone(error: unknown): boolean {
  return ApiError.is(error) && error.code === 401;
}

function serverIsUnreachable(error: unknown): boolean {
  return ApiError.is(error) && error.code === 0;
}

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();

  const { track } = useAnalytics();
  const [signOutPending, setSignOutPending] = useState(hasPendingSignOut);
  const [sessionExpired, setSessionExpired] = useState(false);
  const sessionEndedOnPurposeRef = useRef(false);
  const replayingSignOutRef = useRef(false);

  const invalidateSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    await queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    await queryClient.invalidateQueries({ queryKey: queryKeys.event.all });
  }, [queryClient]);

  const {
    data: sessionUser,
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
  const user = sessionUser ?? null;

  const retryAuthCheck = useCallback(() => {
    void refetchSession();
  }, [refetchSession]);

  const resetAccountQueries = useCallback(
    () =>
      queryClient.resetQueries({
        predicate: (query) => query.queryHash !== hashKey(queryKeys.auth.me),
      }),
    [queryClient]
  );

  const sessionUserId = sessionUser === undefined ? undefined : (sessionUser?.userId ?? null);
  const lastSessionUserIdRef = useRef(sessionUserId);

  useEffect(() => {
    const previousUserId = lastSessionUserIdRef.current;
    lastSessionUserIdRef.current = sessionUserId;
    const sessionStillUnknown = previousUserId === undefined || sessionUserId === undefined;
    if (sessionStillUnknown || previousUserId === sessionUserId) return;
    if (previousUserId !== null) clearStoredEventIdentities();
    const endedOnPurpose = sessionEndedOnPurposeRef.current;
    sessionEndedOnPurposeRef.current = false;
    setSessionExpired(previousUserId !== null && sessionUserId === null && !endedOnPurpose);
    void resetAccountQueries();
  }, [sessionUserId, resetAccountQueries]);

  useEffect(
    () =>
      onUnauthorizedResponse((url) => {
        if (ANSWERS_A_SIGN_IN_FORM.test(url)) return;
        if (!queryClient.getQueryData(queryKeys.auth.me)) return;
        void queryClient.invalidateQueries(
          { queryKey: queryKeys.auth.me },
          { cancelRefetch: false }
        );
      }),
    [queryClient]
  );

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), []);

  const endSession = useCallback(async () => {
    lastSessionUserIdRef.current = null;
    setSessionExpired(false);
    await queryClient.cancelQueries({ queryKey: queryKeys.auth.me });
    clearStoredEventIdentities();
    queryClient.setQueryData(queryKeys.auth.me, null);
    await signedOutStateRendered();
    await resetAccountQueries();
  }, [queryClient, resetAccountQueries]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password, returnTo }: EmailSignIn) => {
      const result = await postAuthLogin(email, password, returnTo);
      if (!result.twoFactorRequired) await invalidateSession();
      return result;
    },
    onSuccess: (result, { returnTo }) => {
      if (result.twoFactorRequired) return;
      setSignOutPending(false);
      track('user_logged_in', { method: 'email', origin: entryOriginOf(returnTo) });
    },
  });

  const twoFactorMutation = useMutation({
    mutationFn: async ({ code }: TwoFactorCodeEntry) => {
      const result = await postTwoFactorVerify(code);
      await invalidateSession();
      return result;
    },
    onSuccess: (result, { returnTo }) => {
      setSignOutPending(false);
      track('user_logged_in', {
        method: result.method,
        origin: entryOriginOf(returnTo),
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, displayName, returnTo }: EmailSignUp) => {
      await postAuthRegister(email, password, displayName, returnTo);
      await invalidateSession();
    },
    onSuccess: (_result, { returnTo }) => {
      setSignOutPending(false);
      markWelcomePending();
      track('user_signed_up', { method: 'email', origin: entryOriginOf(returnTo) });
    },
  });

  useEffect(() => {
    const replaySignOut = async (): Promise<void> => {
      if (replayingSignOutRef.current || !hasPendingSignOut()) return;
      replayingSignOutRef.current = true;
      try {
        await postAuthLogout();
      } catch (error) {
        if (!sessionIsGone(error)) return;
      } finally {
        replayingSignOutRef.current = false;
      }
      clearPendingSignOut();
      setSignOutPending(false);
    };
    const handleOnline = (): void => void replaySignOut();
    handleOnline();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(
    () =>
      onSessionChangedInAnotherTab(() => {
        sessionEndedOnPurposeRef.current = true;
        setSignOutPending(hasPendingSignOut());
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      }),
    [queryClient]
  );

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await postAuthLogout();
      } catch (error) {
        if (!sessionIsGone(error) && !serverIsUnreachable(error)) throw error;
        if (serverIsUnreachable(error)) {
          markSignOutPending();
          setSignOutPending(true);
        }
      } finally {
        void dropBrowserPushSubscription();
      }
      await endSession();
    },
    onSuccess: () => track('user_logged_out'),
  });

  const patchProfileMutation = useMutation({
    mutationFn: (patch: ProfilePatch) => patchAuthProfile(patch),
    onSuccess: (updated) => {
      applyUpdatedProfile(queryClient, updated);
      track('profile_updated');
    },
  });

  const login = useCallback(
    (email: string, password: string, returnTo?: string) =>
      loginMutation.mutateAsync({ email, password, returnTo }),
    [loginMutation]
  );

  const verifyTwoFactor = useCallback(
    (code: string, returnTo?: string) => twoFactorMutation.mutateAsync({ code, returnTo }),
    [twoFactorMutation]
  );

  const register = useCallback(
    (email: string, password: string, displayName: string, returnTo?: string) =>
      registerMutation.mutateAsync({ email, password, displayName, returnTo }),
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
      signOutPending,
      sessionExpired,
      dismissSessionExpired,
      retryAuthCheck,
      login,
      verifyTwoFactor,
      register,
      logout,
      endSession,
      patchProfile,
    }),
    [
      user,
      isLoading,
      authCheckFailed,
      signOutPending,
      sessionExpired,
      dismissSessionExpired,
      retryAuthCheck,
      login,
      verifyTwoFactor,
      register,
      logout,
      endSession,
      patchProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  changePassword as apiChangePassword,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  patchMe as apiPatchMe,
  register as apiRegister,
  type ChangePasswordRequest,
  type LoginRequest,
  type PatchUserProfileRequest,
  type RegisterRequest,
  type UserProfile,
} from '@/api/auth';
import { ApiError, setUnauthorizedHandler } from '@/api/client';
import { clearToken } from '@/lib/auth-storage';

type AuthContextValue = {
  user: UserProfile | null;
  isHydrating: boolean;
  isAuthenticating: boolean;
  register: (body: RegisterRequest) => Promise<void>;
  login: (body: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  patchProfile: (body: PatchUserProfileRequest) => Promise<UserProfile>;
  changePassword: (body: ChangePasswordRequest) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else if (__DEV__) {
        console.warn('[auth] refresh failed', err);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    (async () => {
      try {
        const me = await getMe({ signal: controller.signal });
        if (!cancelled) setUser(me);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
        } else {
          setUser(null);
          if (__DEV__) console.warn('[auth] initial hydration failed', err);
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      clearToken().catch(() => {
        /* ignore */
      });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const register = useCallback(
    async (body: RegisterRequest) => {
      setIsAuthenticating(true);
      try {
        await apiRegister(body);
        await refresh();
      } finally {
        setIsAuthenticating(false);
      }
    },
    [refresh]
  );

  const login = useCallback(
    async (body: LoginRequest) => {
      setIsAuthenticating(true);
      try {
        await apiLogin(body);
        await refresh();
      } finally {
        setIsAuthenticating(false);
      }
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore — clear local state regardless */
    }
    await clearToken().catch(() => {
      /* ignore */
    });
    setUser(null);
  }, []);

  const patchProfile = useCallback(async (body: PatchUserProfileRequest) => {
    const next = await apiPatchMe(body);
    setUser(next);
    return next;
  }, []);

  const changePassword = useCallback(async (body: ChangePasswordRequest) => {
    await apiChangePassword(body);
    await clearToken().catch(() => {
      /* ignore */
    });
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isHydrating,
      isAuthenticating,
      register,
      login,
      logout,
      patchProfile,
      changePassword,
      refresh,
    }),
    [
      user,
      isHydrating,
      isAuthenticating,
      register,
      login,
      logout,
      patchProfile,
      changePassword,
      refresh,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous AuthProvider');
  return ctx;
}

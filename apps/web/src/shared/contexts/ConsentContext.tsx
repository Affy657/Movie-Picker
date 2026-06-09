import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const CONSENT_STORAGE_KEY = 'moviepicker-consent';

type ConsentPrefs = {
  decided: boolean;
  analytics: boolean;
};

type ConsentContextValue = {
  decided: boolean;
  analytics: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: Pick<ConsentPrefs, 'analytics'>) => void;
  reset: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStored(): ConsentPrefs {
  if (typeof window === 'undefined') return { decided: false, analytics: false };
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return { decided: false, analytics: false };
    const parsed = JSON.parse(raw) as unknown;
    const p = parsed as Record<string, unknown>;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof p.decided === 'boolean' &&
      typeof p.analytics === 'boolean'
    ) {
      return { decided: p.decided, analytics: p.analytics };
    }
  } catch {
    // Storage unavailable or invalid JSON — return default consent state
  }
  return { decided: false, analytics: false };
}

function persist(prefs: ConsentPrefs): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable (private browsing or quota exceeded) — write fails silently
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ConsentPrefs>(() => readStored());

  const acceptAll = useCallback(() => {
    const next = { decided: true, analytics: true };
    setPrefs(next);
    persist(next);
  }, []);

  const rejectAll = useCallback(() => {
    const next = { decided: true, analytics: false };
    setPrefs(next);
    persist(next);
  }, []);

  const savePreferences = useCallback(({ analytics }: Pick<ConsentPrefs, 'analytics'>) => {
    const next = { decided: true, analytics };
    setPrefs(next);
    persist(next);
  }, []);

  const reset = useCallback(() => {
    const next = { decided: false, analytics: false };
    setPrefs(next);
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // Storage unavailable (private browsing or quota exceeded) — remove fails silently
    }
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      decided: prefs.decided,
      analytics: prefs.analytics,
      acceptAll,
      rejectAll,
      savePreferences,
      reset,
    }),
    [prefs.decided, prefs.analytics, acceptAll, rejectAll, savePreferences, reset]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent doit être utilisé dans ConsentProvider');
  return ctx;
}

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
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStored(): ConsentPrefs {
  if (typeof window === 'undefined') return { decided: false, analytics: false };
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return { decided: false, analytics: false };
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'decided' in parsed &&
      typeof (parsed as Record<string, unknown>).decided === 'boolean'
    ) {
      return {
        decided: Boolean((parsed as ConsentPrefs).decided),
        analytics: Boolean((parsed as ConsentPrefs).analytics),
      };
    }
  } catch {}
  return { decided: false, analytics: false };
}

function persist(prefs: ConsentPrefs): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
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

  const value = useMemo<ConsentContextValue>(
    () => ({
      decided: prefs.decided,
      analytics: prefs.analytics,
      acceptAll,
      rejectAll,
      savePreferences,
    }),
    [prefs.decided, prefs.analytics, acceptAll, rejectAll, savePreferences]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent doit être utilisé dans ConsentProvider');
  return ctx;
}

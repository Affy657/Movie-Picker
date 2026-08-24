import { useCallback, useEffect, useState } from 'react';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { isKnownInAppBrowser } from '@/shared/utils/inAppBrowser';
import {
  type BeforeInstallPromptEvent,
  type PwaInstallGuideMode,
  type PwaInstallMode,
  type PwaInstallSurface,
  isIosDevice,
  isStandaloneDisplayMode,
  resolvePwaInstallMode,
  toPwaInstallGuideMode,
} from '@/shared/pwa/pwaInstall';

export type { BeforeInstallPromptEvent, PwaInstallGuideMode, PwaInstallMode, PwaInstallSurface };

type NavigatorWithPwa = Navigator & {
  standalone?: boolean;
  getInstalledRelatedApps?: () => Promise<Array<{ platform: string }>>;
};

type PromptOutcome = 'accepted' | 'dismissed' | 'unavailable';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listening = false;
const promptSubscribers = new Set<() => void>();

function notifyPromptSubscribers(): void {
  for (const subscriber of promptSubscribers) subscriber();
}

function handleBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  notifyPromptSubscribers();
}

function handleAppInstalled(): void {
  deferredPrompt = null;
  notifyPromptSubscribers();
}

function ensurePromptListeners(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
}

export function startPwaInstallRuntime(): void {
  ensurePromptListeners();
}

export function resetPwaInstallRuntime(): void {
  deferredPrompt = null;
  promptSubscribers.clear();
  if (listening && typeof window !== 'undefined') {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  }
  listening = false;
}

if (typeof window !== 'undefined') {
  startPwaInstallRuntime();
}

function readStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as NavigatorWithPwa;
  return isStandaloneDisplayMode({
    matchMedia: (query) => window.matchMedia(query),
    navigatorStandalone: nav.standalone,
  });
}

function readIsIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isIosDevice({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
}

export function usePwaInstall(): {
  shouldShow: boolean;
  mode: PwaInstallMode | null;
  promptInstall: () => Promise<PromptOutcome>;
} {
  const [canNativePrompt, setCanNativePrompt] = useState(() => deferredPrompt !== null);
  const [isStandalone, setIsStandalone] = useState(readStandalone);
  const [isInstalledRelatedApp, setIsInstalledRelatedApp] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);

  useEffect(() => {
    startPwaInstallRuntime();
    const syncPrompt = () => setCanNativePrompt(deferredPrompt !== null);
    syncPrompt();
    promptSubscribers.add(syncPrompt);
    return () => {
      promptSubscribers.delete(syncPrompt);
    };
  }, []);

  useEffect(() => {
    const onInstalled = () => {
      setAppInstalled(true);
      setCanNativePrompt(false);
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const overlayQuery = window.matchMedia('(display-mode: window-controls-overlay)');
    const syncStandalone = () => setIsStandalone(readStandalone());
    syncStandalone();
    standaloneQuery.addEventListener('change', syncStandalone);
    overlayQuery.addEventListener('change', syncStandalone);
    return () => {
      standaloneQuery.removeEventListener('change', syncStandalone);
      overlayQuery.removeEventListener('change', syncStandalone);
    };
  }, []);

  useEffect(() => {
    const nav = navigator as NavigatorWithPwa;
    if (!nav.getInstalledRelatedApps) return;
    let cancelled = false;
    nav
      .getInstalledRelatedApps()
      .then((apps) => {
        if (!cancelled && apps.length > 0) setIsInstalledRelatedApp(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const mode = resolvePwaInstallMode({
    isStandalone: isStandalone || appInstalled,
    isInstalledRelatedApp,
    isInAppBrowser: isKnownInAppBrowser(navigator.userAgent),
    canNativePrompt,
    isIos: readIsIos(),
  });

  const promptInstall = useCallback(async (): Promise<PromptOutcome> => {
    const event = deferredPrompt;
    if (!event) return 'unavailable';
    deferredPrompt = null;
    try {
      const promptDone = event.prompt();
      setCanNativePrompt(false);
      notifyPromptSubscribers();
      await promptDone;
      const { outcome } = await event.userChoice;
      return outcome;
    } catch {
      setCanNativePrompt(false);
      notifyPromptSubscribers();
      return 'unavailable';
    }
  }, []);

  return {
    shouldShow: mode !== null,
    mode,
    promptInstall,
  };
}

export function usePwaInstallClick(surface: PwaInstallSurface): {
  shouldShow: boolean;
  mode: PwaInstallMode | null;
  guideOpen: boolean;
  guideMode: PwaInstallGuideMode;
  onClick: () => Promise<void>;
  closeGuide: () => void;
} {
  const { shouldShow, mode, promptInstall } = usePwaInstall();
  const { track } = useAnalytics();
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (!shouldShow) setGuideOpen(false);
  }, [shouldShow]);

  const closeGuide = useCallback(() => setGuideOpen(false), []);

  const onClick = useCallback(async () => {
    if (!mode || !shouldShow) return;
    track('pwa_install_clicked', { surface, mode });
    if (mode === 'native') {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        track('pwa_install_accepted', { surface });
        return;
      }
      if (outcome === 'dismissed') {
        track('pwa_install_dismissed', { surface });
        return;
      }
    }
    const nextGuideMode = toPwaInstallGuideMode(mode);
    setGuideOpen(true);
    track('pwa_install_guide_shown', { surface, mode: nextGuideMode });
  }, [mode, promptInstall, shouldShow, surface, track]);

  return {
    shouldShow,
    mode,
    guideOpen,
    guideMode: toPwaInstallGuideMode(mode),
    onClick,
    closeGuide,
  };
}

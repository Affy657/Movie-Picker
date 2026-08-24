export type PwaInstallMode = 'native' | 'ios' | 'in_app' | 'generic';
export type PwaInstallGuideMode = 'ios' | 'in_app' | 'generic';
export type PwaInstallSurface = 'footer' | 'user_menu';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function isStandaloneDisplayMode(input: {
  matchMedia: (query: string) => { matches: boolean };
  navigatorStandalone?: boolean;
}): boolean {
  if (input.navigatorStandalone === true) return true;
  if (input.matchMedia('(display-mode: standalone)').matches) return true;
  return input.matchMedia('(display-mode: window-controls-overlay)').matches;
}

export function isIosDevice(input: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): boolean {
  if (/iPad|iPhone|iPod/i.test(input.userAgent)) return true;
  return input.platform === 'MacIntel' && input.maxTouchPoints > 1;
}

export function resolvePwaInstallMode(input: {
  isStandalone: boolean;
  isInstalledRelatedApp: boolean;
  isInAppBrowser: boolean;
  canNativePrompt: boolean;
  isIos: boolean;
}): PwaInstallMode | null {
  if (input.isStandalone || input.isInstalledRelatedApp) return null;
  if (input.isInAppBrowser) return 'in_app';
  if (input.canNativePrompt) return 'native';
  if (input.isIos) return 'ios';
  return 'generic';
}

export function toPwaInstallGuideMode(mode: PwaInstallMode | null): PwaInstallGuideMode {
  if (mode === 'ios' || mode === 'in_app') return mode;
  return 'generic';
}

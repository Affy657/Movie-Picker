import { describe, expect, it } from 'vitest';
import {
  isIosDevice,
  isStandaloneDisplayMode,
  resolvePwaInstallMode,
  toPwaInstallGuideMode,
} from '@/shared/pwa/pwaInstall';

describe('isStandaloneDisplayMode', () => {
  it('detects navigator.standalone (iOS)', () => {
    expect(
      isStandaloneDisplayMode({
        matchMedia: () => ({ matches: false }),
        navigatorStandalone: true,
      })
    ).toBe(true);
  });

  it('detects display-mode standalone', () => {
    expect(
      isStandaloneDisplayMode({
        matchMedia: (query) => ({ matches: query === '(display-mode: standalone)' }),
        navigatorStandalone: false,
      })
    ).toBe(true);
  });

  it('detects window-controls-overlay', () => {
    expect(
      isStandaloneDisplayMode({
        matchMedia: (query) => ({
          matches: query === '(display-mode: window-controls-overlay)',
        }),
      })
    ).toBe(true);
  });

  it('retourne false dans un onglet navigateur', () => {
    expect(
      isStandaloneDisplayMode({
        matchMedia: () => ({ matches: false }),
        navigatorStandalone: false,
      })
    ).toBe(false);
  });
});

describe('isIosDevice', () => {
  it('detects iPhone', () => {
    expect(
      isIosDevice({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPhone',
        maxTouchPoints: 5,
      })
    ).toBe(true);
  });

  it('detects iPadOS that declares itself as Macintosh', () => {
    expect(
      isIosDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      })
    ).toBe(true);
  });

  it('does not detect a desktop Mac', () => {
    expect(
      isIosDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      })
    ).toBe(false);
  });
});

describe('resolvePwaInstallMode', () => {
  const browsable = {
    isStandalone: false,
    isInstalledRelatedApp: false,
    isInAppBrowser: false,
    canNativePrompt: false,
    isIos: false,
  };

  it('hides the button in an already open PWA', () => {
    expect(resolvePwaInstallMode({ ...browsable, isStandalone: true })).toBeNull();
  });

  it('hides the button when the related app is already installed', () => {
    expect(resolvePwaInstallMode({ ...browsable, isInstalledRelatedApp: true })).toBeNull();
  });

  it('priorise le navigateur in-app sur le prompt natif', () => {
    expect(
      resolvePwaInstallMode({
        ...browsable,
        isInAppBrowser: true,
        canNativePrompt: true,
      })
    ).toBe('in_app');
  });

  it('utilise le prompt natif quand il est disponible', () => {
    expect(resolvePwaInstallMode({ ...browsable, canNativePrompt: true })).toBe('native');
  });

  it('utilise le guide iOS sans prompt natif', () => {
    expect(resolvePwaInstallMode({ ...browsable, isIos: true })).toBe('ios');
  });

  it('uses the generic guide by default', () => {
    expect(resolvePwaInstallMode(browsable)).toBe('generic');
  });
});

describe('toPwaInstallGuideMode', () => {
  it('conserve ios et in_app', () => {
    expect(toPwaInstallGuideMode('ios')).toBe('ios');
    expect(toPwaInstallGuideMode('in_app')).toBe('in_app');
  });

  it('replie native et generic sur generic', () => {
    expect(toPwaInstallGuideMode('native')).toBe('generic');
    expect(toPwaInstallGuideMode('generic')).toBe('generic');
    expect(toPwaInstallGuideMode(null)).toBe('generic');
  });
});

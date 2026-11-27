import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t as translate } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import type { ActiveSession } from '@/features/auth/types';
import { sessionActivityLabel, sessionDeviceLabel } from './sessionDevice';

const NOW = new Date('2026-11-27T12:00:00Z');

function session(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    id: 'a1',
    browser: 'Chrome',
    operatingSystem: 'Windows',
    deviceKind: 'desktop',
    signedInAt: '2026-11-03T09:00:00Z',
    lastActiveAt: '2026-11-27T10:00:00Z',
    current: false,
    ...overrides,
  };
}

const fr = (key: TranslationKey, params?: Record<string, string>) => translate(key, params, 'fr');
const en = (key: TranslationKey, params?: Record<string, string>) => translate(key, params, 'en');

describe('sessionDeviceLabel', () => {
  it('names the browser and the system', () => {
    expect(sessionDeviceLabel(session(), fr)).toBe('Chrome sur Windows');
    expect(sessionDeviceLabel(session({ browser: 'Safari', operatingSystem: 'iOS' }), en)).toBe(
      'Safari on iOS'
    );
  });

  it('falls back to whichever of the two is known', () => {
    expect(sessionDeviceLabel(session({ browser: null }), fr)).toBe('Windows');
    expect(sessionDeviceLabel(session({ operatingSystem: null }), fr)).toBe('Chrome');
  });

  it('calls a device without browser nor system unidentified', () => {
    expect(sessionDeviceLabel(session({ browser: null, operatingSystem: null }), fr)).toBe(
      'Appareil non identifié'
    );
  });
});

describe('sessionActivityLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('says this device is active now', () => {
    expect(sessionActivityLabel(session({ current: true }), 'fr', fr)).toBe('Actif maintenant');
  });

  it('gives the last activity then the sign-in date of another device', () => {
    expect(sessionActivityLabel(session(), 'fr', fr)).toBe(
      'Actif il y a 2 heures, connecté le 3 nov. 2026'
    );
    expect(sessionActivityLabel(session(), 'en', en)).toBe(
      'Active 2 hours ago, signed in on 3 Nov 2026'
    );
  });

  it('gives only the sign-in date when the last activity is unknown', () => {
    expect(sessionActivityLabel(session({ lastActiveAt: null }), 'fr', fr)).toBe(
      'Connecté le 3 nov. 2026'
    );
  });
});

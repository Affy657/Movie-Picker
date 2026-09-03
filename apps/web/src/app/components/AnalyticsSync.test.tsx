import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsSync from '@/app/components/AnalyticsSync';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { identify, resetIdentity, optIn, optOut } from '@/shared/analytics/posthog';

vi.mock('@/shared/analytics/posthog', () => ({
  identify: vi.fn(),
  resetIdentity: vi.fn(),
  optIn: vi.fn(),
  optOut: vi.fn(),
}));

const useAuth = vi.fn();
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuth(),
}));

const CONSENT_KEY = 'moviepicker-consent';

function renderSync() {
  return render(
    <ConsentProvider>
      <AnalyticsSync />
    </ConsentProvider>
  );
}

describe('AnalyticsSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(CONSENT_KEY);
  });

  it('opt-in et identify quand le consentement analytics est accordé', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: true }));
    useAuth.mockReturnValue({ user: { userId: 'u1' } });
    renderSync();
    expect(optIn).toHaveBeenCalled();
    expect(identify).toHaveBeenCalledWith('u1');
  });

  it('opt-out et reset quand le consentement est refusé', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: false }));
    useAuth.mockReturnValue({ user: { userId: 'u1' } });
    renderSync();
    expect(optOut).toHaveBeenCalled();
    expect(resetIdentity).toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
  });

  it('reset l’identité si analytics est accepté mais l’utilisateur est déconnecté', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: true }));
    useAuth.mockReturnValue({ user: null });
    renderSync();
    expect(optIn).toHaveBeenCalled();
    expect(resetIdentity).toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
  });
});

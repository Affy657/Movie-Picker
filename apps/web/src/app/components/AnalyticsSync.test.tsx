import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsSync from '@/app/components/AnalyticsSync';
import { ConsentProvider, useConsent } from '@/shared/contexts/ConsentContext';
import { identify, initPostHog, resetIdentity, optIn, optOut } from '@/shared/analytics/posthog';

vi.mock('@/shared/analytics/posthog', () => ({
  identify: vi.fn(),
  initPostHog: vi.fn(() => Promise.resolve()),
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

  it('does not load PostHog until consent is given', () => {
    useAuth.mockReturnValue({ user: null });
    renderSync();
    expect(initPostHog).not.toHaveBeenCalled();
    expect(optIn).not.toHaveBeenCalled();
  });

  it('does not load PostHog when analytics consent is declined', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: false }));
    useAuth.mockReturnValue({ user: { userId: 'u1' } });
    renderSync();
    expect(initPostHog).not.toHaveBeenCalled();
  });

  it('loads PostHog only once analytics consent is granted', async () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: true }));
    useAuth.mockReturnValue({ user: { userId: 'u1' } });
    renderSync();
    await vi.waitFor(() => expect(initPostHog).toHaveBeenCalledTimes(1));
  });

  it('opts in and identifies when analytics consent is granted', async () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: true }));
    useAuth.mockReturnValue({ user: { userId: 'u1' } });
    renderSync();
    await vi.waitFor(() => expect(optIn).toHaveBeenCalled());
    expect(identify).toHaveBeenCalledWith('u1');
  });

  it('opts out and resets when consent is declined', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: false }));
    useAuth.mockReturnValue({ user: { userId: 'u1' } });
    renderSync();
    expect(optOut).toHaveBeenCalled();
    expect(resetIdentity).toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
  });

  it('resets the identity when analytics is accepted but the user is signed out', async () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: true }));
    useAuth.mockReturnValue({ user: null });
    renderSync();
    await vi.waitFor(() => expect(optIn).toHaveBeenCalled());
    expect(resetIdentity).toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
  });

  it('never opts back in when consent is withdrawn while PostHog is still loading', async () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: true }));
    useAuth.mockReturnValue({ user: null });
    let finishLoading: () => void = () => {};
    vi.mocked(initPostHog).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishLoading = resolve;
      })
    );
    let withdrawConsent: () => void = () => {};
    function ConsentWithdrawal() {
      withdrawConsent = useConsent().rejectAll;
      return null;
    }
    render(
      <ConsentProvider>
        <AnalyticsSync />
        <ConsentWithdrawal />
      </ConsentProvider>
    );

    act(() => withdrawConsent());
    await act(async () => {
      finishLoading();
      await Promise.resolve();
    });

    const lastOptIn = Math.max(0, ...vi.mocked(optIn).mock.invocationCallOrder);
    const lastOptOut = Math.max(0, ...vi.mocked(optOut).mock.invocationCallOrder);
    expect(lastOptOut).toBeGreaterThan(lastOptIn);
  });
});

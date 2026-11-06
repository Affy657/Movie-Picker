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

function renderedSync() {
  return (
    <ConsentProvider>
      <AnalyticsSync />
    </ConsentProvider>
  );
}

function grantConsent() {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: true }));
}

describe('AnalyticsSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(CONSENT_KEY);
  });

  it('does not load PostHog until consent is given', () => {
    useAuth.mockReturnValue({ user: null, isLoading: false });
    renderSync();
    expect(initPostHog).not.toHaveBeenCalled();
    expect(optIn).not.toHaveBeenCalled();
  });

  it('does not load PostHog when analytics consent is declined', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: false }));
    useAuth.mockReturnValue({ user: { userId: 'u1' }, isLoading: false });
    renderSync();
    expect(initPostHog).not.toHaveBeenCalled();
  });

  it('loads PostHog only once analytics consent is granted', async () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: true }));
    useAuth.mockReturnValue({ user: { userId: 'u1' }, isLoading: false });
    renderSync();
    await vi.waitFor(() => expect(initPostHog).toHaveBeenCalledTimes(1));
  });

  it('opts in and identifies when analytics consent is granted', async () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: true }));
    useAuth.mockReturnValue({ user: { userId: 'u1' }, isLoading: false });
    renderSync();
    await vi.waitFor(() => expect(optIn).toHaveBeenCalled());
    expect(identify).toHaveBeenCalledWith('u1');
  });

  it('opts out without identifying when consent is declined', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decided: true, analytics: false }));
    useAuth.mockReturnValue({ user: { userId: 'u1' }, isLoading: false });
    renderSync();
    expect(optOut).toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
  });

  it('never resets the identity of an anonymous visitor', async () => {
    grantConsent();
    useAuth.mockReturnValue({ user: null, isLoading: false });
    const view = renderSync();
    await vi.waitFor(() => expect(optIn).toHaveBeenCalled());

    view.rerender(renderedSync());

    expect(resetIdentity).not.toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
  });

  it('leaves the identity alone while the session is loading', async () => {
    grantConsent();
    useAuth.mockReturnValue({ user: null, isLoading: true });
    const view = renderSync();
    await vi.waitFor(() => expect(optIn).toHaveBeenCalled());
    expect(resetIdentity).not.toHaveBeenCalled();

    useAuth.mockReturnValue({ user: { userId: 'u1' }, isLoading: false });
    view.rerender(renderedSync());

    expect(identify).toHaveBeenCalledWith('u1');
    expect(resetIdentity).not.toHaveBeenCalled();
  });

  it('resets the identity once when a signed-in user signs out', async () => {
    grantConsent();
    useAuth.mockReturnValue({ user: { userId: 'u1' }, isLoading: false });
    const view = renderSync();
    await vi.waitFor(() => expect(identify).toHaveBeenCalledWith('u1'));

    useAuth.mockReturnValue({ user: null, isLoading: false });
    view.rerender(renderedSync());
    view.rerender(renderedSync());

    expect(resetIdentity).toHaveBeenCalledTimes(1);
  });

  it('never opts back in when consent is withdrawn while PostHog is still loading', async () => {
    grantConsent();
    useAuth.mockReturnValue({ user: null, isLoading: false });
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

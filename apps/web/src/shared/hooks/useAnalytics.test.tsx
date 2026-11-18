import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ConsentProvider, useConsent } from '@/shared/contexts/ConsentContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { resetOnceInTabForTests } from '@/shared/analytics/onceInTab';

const { capture, reportUsage } = vi.hoisted(() => ({ capture: vi.fn(), reportUsage: vi.fn() }));
vi.mock('@/shared/analytics/posthog', () => ({ capture }));
vi.mock('@/shared/analytics/usageCounts', () => ({ reportUsage }));

const CONSENT_KEY = 'moviepicker-consent';

function givenConsent(consent: { decided: boolean; analytics: boolean } | null) {
  if (consent) localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
}

function renderAnalytics() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ConsentProvider>{children}</ConsentProvider>
  );
  return renderHook(() => ({ analytics: useAnalytics(), consent: useConsent() }), { wrapper });
}

describe('useAnalytics', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetOnceInTabForTests();
  });

  afterEach(() => {
    capture.mockReset();
    reportUsage.mockReset();
  });

  it('counts an entry step anonymously while the visitor has not answered the banner', () => {
    const { result } = renderAnalytics();

    result.current.analytics.track('event_link_opened', { viewer: 'visitor', state: 'open' });

    expect(reportUsage).toHaveBeenCalledWith({
      metric: 'event_link_opened',
      variant: 'visitor.open',
    });
    expect(capture).not.toHaveBeenCalled();
  });

  it('counts the step and sends the event once the visitor accepted the measure', () => {
    givenConsent({ decided: true, analytics: true });
    const { result } = renderAnalytics();

    result.current.analytics.track('join_prompt_clicked', { cta: 'register' });

    expect(reportUsage).toHaveBeenCalledWith({
      metric: 'join_prompt_clicked',
      variant: 'register',
    });
    expect(capture).toHaveBeenCalledWith('join_prompt_clicked', { cta: 'register' });
  });

  it('counts nothing at all once the visitor refused the measure', () => {
    givenConsent({ decided: true, analytics: false });
    const { result } = renderAnalytics();

    result.current.analytics.track('recap_viewed', { viewer: 'account', winners: 1 });

    expect(reportUsage).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('leaves the events that are not counted to the measure alone', () => {
    const { result } = renderAnalytics();

    result.current.analytics.track('vote_cast', { value: 1 });

    expect(reportUsage).not.toHaveBeenCalled();
  });

  it('reads the pick source as the counted variant', () => {
    const { result } = renderAnalytics();

    result.current.analytics.track('random_pick_opened', {
      source: 'saved_list',
      scope: 'list',
      pool: 4,
    });

    expect(reportUsage).toHaveBeenCalledWith({
      metric: 'random_pick_opened',
      variant: 'saved_list',
    });
  });

  it('reports a once-per-tab step a single time', () => {
    givenConsent({ decided: true, analytics: true });
    const { result } = renderAnalytics();

    result.current.analytics.track(
      'recap_viewed',
      { viewer: 'visitor', winners: 2 },
      { oncePerTab: 'recap:r1' }
    );
    result.current.analytics.track(
      'recap_viewed',
      { viewer: 'visitor', winners: 2 },
      { oncePerTab: 'recap:r1' }
    );

    expect(reportUsage).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('still sends a once-per-tab event the visitor accepts after it was counted', () => {
    const { result } = renderAnalytics();
    result.current.analytics.track(
      'event_link_opened',
      { viewer: 'visitor', state: 'open' },
      { oncePerTab: 'open:e1' }
    );

    act(() => result.current.consent.acceptAll());
    result.current.analytics.track(
      'event_link_opened',
      { viewer: 'visitor', state: 'open' },
      { oncePerTab: 'open:e1' }
    );

    expect(reportUsage).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('event_link_opened', { viewer: 'visitor', state: 'open' });
  });
});

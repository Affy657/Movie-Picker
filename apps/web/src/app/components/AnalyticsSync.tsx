import { useEffect, useRef } from 'react';
import { useConsent } from '@/shared/contexts/ConsentContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { identify, initPostHog, resetIdentity, optIn, optOut } from '@/shared/analytics/posthog';

export default function AnalyticsSync() {
  const { analytics, decided } = useConsent();
  const { user, isLoading } = useAuth();
  const signedInUserId = user?.userId ?? null;
  const lastSignedInUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!decided) return;
    if (!analytics) {
      optOut();
      return;
    }
    optIn();
    void initPostHog();
  }, [analytics, decided]);

  useEffect(() => {
    if (isLoading) return;
    const wasSignedIn = lastSignedInUserIdRef.current !== null;
    lastSignedInUserIdRef.current = signedInUserId;
    if (!analytics) return;
    if (signedInUserId) identify(signedInUserId);
    else if (wasSignedIn) resetIdentity();
  }, [signedInUserId, isLoading, analytics]);

  return null;
}

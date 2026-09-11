import { useEffect } from 'react';
import { useConsent } from '@/shared/contexts/ConsentContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { identify, initPostHog, resetIdentity, optIn, optOut } from '@/shared/analytics/posthog';

export default function AnalyticsSync() {
  const { analytics, decided } = useConsent();
  const { user } = useAuth();

  useEffect(() => {
    if (!decided) return;
    if (!analytics) {
      optOut();
      return;
    }
    void initPostHog().then(optIn);
  }, [analytics, decided]);

  useEffect(() => {
    if (!analytics) {
      resetIdentity();
      return;
    }
    if (user) {
      identify(user.userId);
    } else {
      resetIdentity();
    }
  }, [user, analytics]);

  return null;
}

import { useEffect } from 'react';
import { useConsent } from '@/shared/contexts/ConsentContext';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { identify, resetIdentity, optIn, optOut } from '@/shared/analytics/posthog';

export default function AnalyticsSync() {
  const { analytics, decided } = useConsent();
  const { user } = useAuth();

  useEffect(() => {
    if (!decided) return;
    if (analytics) {
      optIn();
    } else {
      optOut();
    }
  }, [analytics, decided]);

  useEffect(() => {
    if (!analytics) {
      resetIdentity();
      return;
    }
    if (user) {
      identify(user.userId, { displayName: user.displayName, handle: user.handle });
    } else {
      resetIdentity();
    }
  }, [user, analytics]);

  return null;
}

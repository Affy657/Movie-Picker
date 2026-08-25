import { useCallback } from 'react';
import { useConsent } from '@/shared/contexts/ConsentContext';
import { capture } from '@/shared/analytics/posthog';

export type AnalyticsEvent =
  | 'user_signed_up'
  | 'user_logged_in'
  | 'user_logged_out'
  | 'profile_updated'
  | 'event_created'
  | 'event_deleted'
  | 'event_joined'
  | 'event_left'
  | 'invitation_sent'
  | 'movie_added'
  | 'movie_removed'
  | 'movie_picked'
  | 'event_closed'
  | 'user_followed'
  | 'user_unfollowed'
  | 'donation_link_clicked'
  | 'pwa_install_clicked'
  | 'pwa_install_accepted'
  | 'pwa_install_dismissed'
  | 'pwa_install_guide_shown';

export function useAnalytics() {
  const { analytics } = useConsent();

  const track = useCallback(
    (event: AnalyticsEvent, properties?: Record<string, unknown>) => {
      if (!analytics) return;
      capture(event, properties);
    },
    [analytics]
  );

  return { track };
}

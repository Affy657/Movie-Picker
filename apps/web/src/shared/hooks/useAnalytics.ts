import { useCallback } from 'react';
import { useConsent } from '@/shared/contexts/ConsentContext';
import { capture } from '@/shared/analytics/posthog';
import { firstTimeInTab } from '@/shared/analytics/onceInTab';
import {
  reportUsage,
  type EventLinkState,
  type GlobalSearchKind,
  type JoinPromptCta,
  type RandomPickSource,
  type ReportedUsage,
  type UsageViewer,
} from '@/shared/analytics/usageCounts';

export type AnalyticsEvent =
  | 'user_signed_up'
  | 'user_logged_in'
  | 'user_logged_out'
  | 'profile_updated'
  | 'event_created'
  | 'event_deleted'
  | 'event_joined'
  | 'event_left'
  | 'event_link_opened'
  | 'join_prompt_clicked'
  | 'invitation_sent'
  | 'link_shared'
  | 'vote_cast'
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
  | 'pwa_install_guide_shown'
  | 'signed_out_cta_clicked'
  | 'movie_rated'
  | 'recap_viewed'
  | 'watchlist_added'
  | 'random_pick_opened'
  | 'global_search_result_opened'
  | 'letterboxd_connected'
  | 'letterboxd_disconnected'
  | 'letterboxd_synced'
  | 'letterboxd_choices_confirmed';

interface CountedEventProperties {
  event_link_opened: { viewer: UsageViewer; state: EventLinkState };
  join_prompt_clicked: { cta: JoinPromptCta };
  recap_viewed: { viewer: UsageViewer; winners: number };
  random_pick_opened: { source: RandomPickSource; scope: string; pool: number };
  global_search_result_opened: { kind: GlobalSearchKind; source: 'header' | 'home' };
}

type CountedEvent = keyof CountedEventProperties;

export interface TrackOptions {
  oncePerTab?: string;
}

type TrackArguments<E extends AnalyticsEvent> = E extends CountedEvent
  ? [properties: CountedEventProperties[E], options?: TrackOptions]
  : [properties?: Record<string, unknown>, options?: TrackOptions];

function countedUsageOf(event: AnalyticsEvent, properties: unknown): ReportedUsage | null {
  switch (event) {
    case 'event_link_opened': {
      const { viewer, state } = properties as CountedEventProperties['event_link_opened'];
      return { metric: event, variant: `${viewer}.${state}` };
    }
    case 'join_prompt_clicked':
      return { metric: event, variant: (properties as CountedEventProperties[typeof event]).cta };
    case 'recap_viewed':
      return {
        metric: event,
        variant: (properties as CountedEventProperties[typeof event]).viewer,
      };
    case 'random_pick_opened':
      return {
        metric: event,
        variant: (properties as CountedEventProperties[typeof event]).source,
      };
    case 'global_search_result_opened':
      return {
        metric: event,
        variant: (properties as CountedEventProperties[typeof event]).kind,
      };
    default:
      return null;
  }
}

function firstTimeFor(channel: string, options: TrackOptions | undefined): boolean {
  return options?.oncePerTab === undefined || firstTimeInTab(`${channel}:${options.oncePerTab}`);
}

export function useAnalytics() {
  const { analytics, decided } = useConsent();
  const refused = decided && !analytics;

  const track = useCallback(
    <E extends AnalyticsEvent>(event: E, ...[properties, options]: TrackArguments<E>) => {
      const usage = countedUsageOf(event, properties);
      if (usage && !refused && firstTimeFor('count', options)) void reportUsage(usage);
      if (!analytics || !firstTimeFor('capture', options)) return;
      capture(event, properties);
    },
    [analytics, refused]
  );

  return { track };
}

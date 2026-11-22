import { fetchApi } from '@/shared/api/client';

export type UsageViewer = 'visitor' | 'account';

export type EventLinkState = 'open' | 'full' | 'closed';

export type JoinPromptCta = 'login' | 'register';

export type RandomPickSource = 'watchlist' | 'list' | 'saved_list' | 'catalog';

export type GlobalSearchKind = 'title' | 'all_titles' | 'member' | 'night';

export type ReportedUsage =
  | { metric: 'event_link_opened'; variant: `${UsageViewer}.${EventLinkState}` }
  | { metric: 'join_prompt_clicked'; variant: JoinPromptCta }
  | { metric: 'recap_viewed'; variant: UsageViewer }
  | { metric: 'random_pick_opened'; variant: RandomPickSource }
  | { metric: 'global_search_result_opened'; variant: GlobalSearchKind };

export async function reportUsage(usage: ReportedUsage): Promise<void> {
  try {
    await fetchApi('/usage-counts', {
      method: 'POST',
      body: JSON.stringify(usage),
      keepalive: true,
    });
  } catch {
    return;
  }
}

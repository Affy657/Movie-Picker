import { fetchApi } from '@/shared/api/client';
import type { ApiSchemas } from '@/shared/api/contract';

export type MyGroups = ApiSchemas['MyGroupsResponse'];

export type FriendGroupSummary = ApiSchemas['FriendGroupSummaryResponse'];

export function fetchMyGroups(signal?: AbortSignal): Promise<MyGroups> {
  return fetchApi<MyGroups>('/groups', { signal });
}

import { fetchApi } from '@/shared/api/client';

export interface PublicProfile {
  handle: string;
  displayName: string;
  avatarId: string;
  bio: string | null;
  memberSince: string;
}

export interface HandleAvailability {
  handle: string;
  available: boolean;
  reason: string | null;
}

export async function fetchPublicProfile(handle: string): Promise<PublicProfile> {
  return fetchApi<PublicProfile>(`/users/${encodeURIComponent(handle)}`);
}

export async function checkHandleAvailability(handle: string): Promise<HandleAvailability> {
  return fetchApi<HandleAvailability>(
    `/users/handle-available?handle=${encodeURIComponent(handle)}`
  );
}

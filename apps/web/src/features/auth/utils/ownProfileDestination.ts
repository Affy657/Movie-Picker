import { ROUTES } from '@/app/routes';
import type { UserProfile } from '@/features/auth/types';

export type OwnProfileDestination = {
  path: string;
  isPublicProfile: boolean;
};

export function ownProfileDestination(
  user: Readonly<Pick<UserProfile, 'handle' | 'isProfilePublic'>>
): OwnProfileDestination {
  const isPublicProfile = Boolean(user.handle) && user.isProfilePublic === true;
  return {
    path: isPublicProfile ? ROUTES.profile(user.handle) : ROUTES.account,
    isPublicProfile,
  };
}

function normalizeHandle(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase();
}

export function isOwnHandle(
  user: Readonly<Pick<UserProfile, 'handle'>> | null,
  urlHandle: string | undefined
): boolean {
  if (!user) return false;
  const ownHandle = normalizeHandle(user.handle);
  return ownHandle !== '' && ownHandle === normalizeHandle(urlHandle);
}

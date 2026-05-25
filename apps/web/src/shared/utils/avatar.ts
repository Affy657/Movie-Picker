// Must match regex in AuthDtos.cs → PatchUserProfileRequest.AvatarId
export const AVATAR_IDS = [
  'clap',
  'reel',
  'popcorn',
  'camera',
  'projector',
  'trophy',
  'masks',
  'star',
  'ticket',
  'seat',
  'lens',
  'director',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function avatarUrl(avatarId: string): string {
  return `/avatars/${avatarId}.svg`;
}

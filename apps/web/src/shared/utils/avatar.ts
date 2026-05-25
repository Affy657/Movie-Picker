// Must match regex in AuthDtos.cs → PatchUserProfileRequest.AvatarId
export const AVATAR_IDS = [
  'ember',
  'frost',
  'jade',
  'kale',
  'luna',
  'mist',
  'nova',
  'opal',
  'pine',
  'reef',
  'sage',
  'zara',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function avatarUrl(avatarId: string): string {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(avatarId)}&radius=50`;
}

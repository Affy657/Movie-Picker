// Must match regex in AuthDtos.cs → PatchUserProfileRequest.AvatarId
export const AVATAR_IDS = [
  'alpha',
  'beta',
  'bolt',
  'byte',
  'crux',
  'delta',
  'flux',
  'forge',
  'gamma',
  'jolt',
  'kilo',
  'laser',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function avatarUrl(avatarId: string): string {
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(avatarId)}&radius=50`;
}

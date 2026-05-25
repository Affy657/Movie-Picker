// Must match regex in AuthDtos.cs → PatchUserProfileRequest.AvatarId
export const BOTTTS_IDS = [
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
  'dex',
  'sigma',
  'droid',
  'theta',
  'glyph',
  'vibe',
] as const;

export const EMOJI_IDS = [
  'cute',
  'nova',
  'hero',
  'halo',
  'riot',
  'glee',
  'keen',
  'jazz',
  'fizz',
  'zest',
  'bold',
  'epic',
] as const;

export const AVATAR_IDS = [...BOTTTS_IDS, ...EMOJI_IDS] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

const EMOJI_SET = new Set<string>(EMOJI_IDS);

export function avatarUrl(avatarId: string): string {
  const style = EMOJI_SET.has(avatarId) ? 'fun-emoji' : 'bottts-neutral';
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(avatarId)}&radius=50`;
}

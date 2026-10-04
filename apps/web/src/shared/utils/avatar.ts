import { apiUrl } from '@/shared/api/client';

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
  'chip',
  'vibe',
] as const;

export const EMOJI_IDS = [
  'cute',
  'wink',
  'hero',
  'halo',
  'grin',
  'cool',
  'keen',
  'jazz',
  'fizz',
  'zest',
  'bold',
  'epic',
  'bask',
  'nod',
  'glow',
  'zoom',
  'snap',
  'luxe',
] as const;

export const AVATAR_IDS = [...BOTTTS_IDS, ...EMOJI_IDS] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

const EMOJI_SET = new Set<string>(EMOJI_IDS);

export const AVATAR_PHOTO_PREFIX = 'photo:';

export function isAvatarPhotoId(avatarId: string | null | undefined): avatarId is string {
  return typeof avatarId === 'string' && avatarId.startsWith(AVATAR_PHOTO_PREFIX);
}

export function avatarUrl(avatarId: string): string {
  if (isAvatarPhotoId(avatarId)) {
    return apiUrl(`/avatars/${encodeURIComponent(avatarId.slice(AVATAR_PHOTO_PREFIX.length))}`);
  }
  const style = EMOJI_SET.has(avatarId) ? 'fun-emoji' : 'bottts-neutral';
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(avatarId)}&radius=50`;
}

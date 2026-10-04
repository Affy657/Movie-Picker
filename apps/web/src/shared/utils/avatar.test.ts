import { describe, expect, it } from 'vitest';
import { apiUrl } from '@/shared/api/client';
import { avatarUrl, isAvatarPhotoId } from '@/shared/utils/avatar';

describe('avatarUrl', () => {
  it('serves a robot from DiceBear', () => {
    expect(avatarUrl('bolt')).toBe(
      'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=bolt&radius=50'
    );
  });

  it('serves an emoji from DiceBear', () => {
    expect(avatarUrl('cute')).toBe(
      'https://api.dicebear.com/9.x/fun-emoji/svg?seed=cute&radius=50'
    );
  });

  it('serves a profile photo from the API', () => {
    expect(avatarUrl('photo:0123456789abcdef0123456789abcdef')).toBe(
      apiUrl('/avatars/0123456789abcdef0123456789abcdef')
    );
  });
});

describe('isAvatarPhotoId', () => {
  it('recognises a profile photo', () => {
    expect(isAvatarPhotoId('photo:0123456789abcdef0123456789abcdef')).toBe(true);
  });

  it.each(['bolt', '', null, undefined])('does not take %s for a photo', (value) => {
    expect(isAvatarPhotoId(value)).toBe(false);
  });
});

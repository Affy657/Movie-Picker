import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/app/routes';
import { isOwnHandle, ownProfileDestination } from '@/features/auth/utils/ownProfileDestination';

describe('ownProfileDestination', () => {
  it('leads to the public profile page when the profile is public', () => {
    expect(ownProfileDestination({ handle: 'alice', isProfilePublic: true })).toEqual({
      path: ROUTES.profile('alice'),
      isPublicProfile: true,
    });
  });

  it('leads to the settings when the profile is private, since its page answers 404 to its owner', () => {
    expect(ownProfileDestination({ handle: 'alice', isProfilePublic: false })).toEqual({
      path: ROUTES.account,
      isPublicProfile: false,
    });
  });

  it('leads to the settings when the account has no handle yet', () => {
    expect(ownProfileDestination({ handle: '', isProfilePublic: true })).toEqual({
      path: ROUTES.account,
      isPublicProfile: false,
    });
  });
});

describe('isOwnHandle', () => {
  it('matches the handle of the URL the way the API normalizes it', () => {
    expect(isOwnHandle({ handle: 'alice' }, ' Alice ')).toBe(true);
  });

  it('does not match someone else, a signed-out visitor or an account without handle', () => {
    expect(isOwnHandle({ handle: 'alice' }, 'bob')).toBe(false);
    expect(isOwnHandle(null, 'alice')).toBe(false);
    expect(isOwnHandle({ handle: '' }, '')).toBe(false);
    expect(isOwnHandle({ handle: 'alice' }, undefined)).toBe(false);
  });
});

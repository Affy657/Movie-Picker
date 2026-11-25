import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/app/routes';
import { entryOriginOf } from '@/shared/analytics/entryOrigin';
import { hostYourOwnHref } from './EventWinnerStage';

describe('hostYourOwnHref', () => {
  it('sends a guest to sign up with a return path counted as an entry from a night', () => {
    const href = new URL(hostYourOwnHref(false), 'https://www.movie-picker.fr');

    expect(href.pathname).toBe(ROUTES.register);
    expect(entryOriginOf(href.searchParams.get('returnTo'))).toBe('event');
  });

  it('sends a member straight to the new night', () => {
    expect(hostYourOwnHref(true)).toBe(ROUTES.createEvent);
  });
});

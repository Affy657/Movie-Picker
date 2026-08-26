import { describe, expect, it } from 'vitest';
import { shouldDropSentryEvent } from '@/shared/observability/sentry';

describe('shouldDropSentryEvent', () => {
  it('écarte le pont injecté par le navigateur intégré Snapchat', () => {
    expect(
      shouldDropSentryEvent({
        exception: { values: [{ value: "Can't find variable: SCDynimacBridge" }] },
      })
    ).toBe(true);
  });

  it('conserve une erreur applicative', () => {
    expect(
      shouldDropSentryEvent({
        exception: { values: [{ value: 'Cannot read properties of undefined' }] },
      })
    ).toBe(false);
  });

  it('conserve un événement sans exception', () => {
    expect(shouldDropSentryEvent({})).toBe(false);
  });
});

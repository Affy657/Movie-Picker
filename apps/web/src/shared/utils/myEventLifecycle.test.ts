import { describe, it, expect } from 'vitest';
import { isMyEventLifecycle, normalizeMyEventLifecycle } from '@/shared/utils/myEventLifecycle';

describe('myEventLifecycle', () => {
  it('normalizeMyEventLifecycle defaults unknown to finished', () => {
    expect(normalizeMyEventLifecycle(undefined)).toBe('finished');
    expect(normalizeMyEventLifecycle('')).toBe('finished');
    expect(normalizeMyEventLifecycle('broken')).toBe('finished');
  });

  it('isMyEventLifecycle narrows type', () => {
    expect(isMyEventLifecycle('upcoming')).toBe(true);
    expect(isMyEventLifecycle('pending')).toBe(true);
    expect(isMyEventLifecycle('finished')).toBe(true);
    expect(isMyEventLifecycle('nope')).toBe(false);
  });
});

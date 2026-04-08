import { describe, it, expect } from 'vitest';
import {
  isMyEventLifecycle,
  myEventLifecycleLabel,
  normalizeMyEventLifecycle,
} from './myEventLifecycle';

describe('myEventLifecycle', () => {
  it('labels lifecycle in French', () => {
    expect(myEventLifecycleLabel('upcoming')).toBe('À venir');
    expect(myEventLifecycleLabel('live')).toBe('En cours');
    expect(myEventLifecycleLabel('finished')).toBe('Terminée');
  });

  it('normalizeMyEventLifecycle defaults unknown to finished', () => {
    expect(normalizeMyEventLifecycle(undefined)).toBe('finished');
    expect(normalizeMyEventLifecycle('')).toBe('finished');
    expect(normalizeMyEventLifecycle('broken')).toBe('finished');
  });

  it('isMyEventLifecycle narrows type', () => {
    expect(isMyEventLifecycle('upcoming')).toBe(true);
    expect(isMyEventLifecycle('finished')).toBe(true);
    expect(isMyEventLifecycle('nope')).toBe(false);
  });
});

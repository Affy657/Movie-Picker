import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { browserTargets, buildTargetsFrom } from './browserTargets';

describe('browserTargets', () => {
  it('keeps the oldest version of each browser the build can lower to', () => {
    expect(
      buildTargetsFrom([
        'ios_saf 16.0',
        'ios_saf 15.4',
        'ios_saf 15.6-15.8',
        'safari 15.4',
        'op_mini all',
      ])
    ).toEqual(['ios15.4', 'safari15.4']);
  });

  it('builds for the iPhones still on iOS 15.4', () => {
    expect(browserTargets(path.resolve(import.meta.dirname, '..'))).toEqual(
      expect.arrayContaining(['ios15.4', 'safari15.4', 'chrome111', 'firefox114'])
    );
  });
});

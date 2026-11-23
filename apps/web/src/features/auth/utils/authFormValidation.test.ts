import { describe, it, expect } from 'vitest';
import { displayNameProblem, looksLikeEmail } from '@/features/auth/utils/authFormValidation';

describe('displayNameProblem', () => {
  it('tells an empty name from a name made of spaces', () => {
    expect(displayNameProblem('')).toBe('missing');
    expect(displayNameProblem('   ')).toBe('blank');
  });

  it('accepts a name with surrounding spaces', () => {
    expect(displayNameProblem('  Camille ')).toBeNull();
  });
});

describe('looksLikeEmail', () => {
  it('accepts an address with an at sign between two parts', () => {
    expect(looksLikeEmail('camille@exemple.fr')).toBe(true);
    expect(looksLikeEmail('  camille@exemple.fr ')).toBe(true);
  });

  it('refuses an empty value, a missing at sign or spaces inside', () => {
    expect(looksLikeEmail('')).toBe(false);
    expect(looksLikeEmail('camille')).toBe(false);
    expect(looksLikeEmail('camille@')).toBe(false);
    expect(looksLikeEmail('cam ille@exemple.fr')).toBe(false);
  });
});

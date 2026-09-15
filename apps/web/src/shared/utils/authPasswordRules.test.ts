import { describe, it, expect } from 'vitest';
import { isRegisterPasswordCompliant } from '@/shared/utils/authPasswordRules';

describe('isRegisterPasswordCompliant', () => {
  it('accepts 8+ characters with a letter and a digit', () => {
    expect(isRegisterPasswordCompliant('abcd1234')).toBe(true);
    expect(isRegisterPasswordCompliant('Passw0rd')).toBe(true);
    expect(isRegisterPasswordCompliant('café1234')).toBe(true);
  });

  it('refuse trop court, sans lettre ou sans chiffre', () => {
    expect(isRegisterPasswordCompliant('short')).toBe(false);
    expect(isRegisterPasswordCompliant('abcdefgh')).toBe(false);
    expect(isRegisterPasswordCompliant('12345678')).toBe(false);
  });
});

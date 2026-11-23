import { describe, expect, it } from 'vitest';
import { SECURITY_TXT_FILE, SECURITY_TXT_VALIDITY_DAYS, buildSecurityTxt } from './securityTxt';

function field(text: string, name: string): string[] {
  return text
    .split('\n')
    .filter((line) => line.startsWith(`${name}: `))
    .map((line) => line.slice(name.length + 2));
}

describe('buildSecurityTxt', () => {
  const builtAt = new Date('2026-11-23T10:00:00Z');
  const text = buildSecurityTxt(builtAt);

  it('is served where RFC 9116 looks for it', () => {
    expect(SECURITY_TXT_FILE).toBe('.well-known/security.txt');
  });

  it('names the two private channels of SECURITY.md, the private report first', () => {
    expect(field(text, 'Contact')).toEqual([
      'https://github.com/Affy657/Movie-Picker/security/advisories/new',
      'mailto:contact@movie-picker.fr',
    ]);
  });

  it('expires less than a year after the build, so a deployment keeps it fresh', () => {
    const [expires] = field(text, 'Expires');
    const expiry = new Date(expires!);
    expect(expires).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(expiry.getTime() - builtAt.getTime()).toBe(SECURITY_TXT_VALIDITY_DAYS * 86_400_000);
    expect(SECURITY_TXT_VALIDITY_DAYS).toBeLessThan(365);
  });

  it('points at its canonical address, the policy and the languages it is answered in', () => {
    expect(field(text, 'Canonical')).toEqual([
      'https://www.movie-picker.fr/.well-known/security.txt',
    ]);
    expect(field(text, 'Policy')).toEqual([
      'https://github.com/Affy657/Movie-Picker/blob/master/SECURITY.md',
    ]);
    expect(field(text, 'Preferred-Languages')).toEqual(['fr, en']);
  });

  it('ends every line with a line feed and carries no blank field', () => {
    expect(text.endsWith('\n')).toBe(true);
    expect(
      text
        .split('\n')
        .slice(0, -1)
        .every((line) => /^[A-Z][\w-]*: \S/.test(line))
    ).toBe(true);
  });
});

import type { Plugin } from 'vite';

export const SECURITY_TXT_FILE = '.well-known/security.txt';

export const SECURITY_TXT_VALIDITY_DAYS = 180;

const DAY_MS = 86_400_000;
const SITE_URL = 'https://www.movie-picker.fr';
const REPOSITORY_URL = 'https://github.com/Affy657/Movie-Picker';

export function buildSecurityTxt(builtAt: Date): string {
  const expires = new Date(builtAt.getTime() + SECURITY_TXT_VALIDITY_DAYS * DAY_MS);
  return [
    `Contact: ${REPOSITORY_URL}/security/advisories/new`,
    'Contact: mailto:contact@movie-picker.fr',
    `Expires: ${expires.toISOString()}`,
    'Preferred-Languages: fr, en',
    `Canonical: ${SITE_URL}/${SECURITY_TXT_FILE}`,
    `Policy: ${REPOSITORY_URL}/blob/master/SECURITY.md`,
    '',
  ].join('\n');
}

export function securityTxtPlugin(): Plugin {
  return {
    name: 'moviepicker-security-txt',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: SECURITY_TXT_FILE,
        source: buildSecurityTxt(new Date()),
      });
    },
  };
}

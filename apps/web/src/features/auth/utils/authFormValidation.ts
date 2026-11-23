const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;

export type DisplayNameProblem = 'missing' | 'blank';

export function displayNameProblem(raw: string): DisplayNameProblem | null {
  if (raw.length === 0) return 'missing';
  return raw.trim().length === 0 ? 'blank' : null;
}

export function looksLikeEmail(raw: string): boolean {
  return EMAIL_SHAPE.test(raw.trim());
}

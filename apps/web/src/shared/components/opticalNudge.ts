const DESCENDERS = /[gjpqy]/;

export function hasDescenders(text: string): boolean {
  return DESCENDERS.test(text);
}

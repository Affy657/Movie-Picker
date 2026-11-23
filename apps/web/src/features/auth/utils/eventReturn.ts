const EVENT_RETURN_PATTERN = /^\/e\/[^/?#]+/;

export function returnsToEvent(returnTo: string | undefined): boolean {
  return EVENT_RETURN_PATTERN.test(returnTo ?? '');
}

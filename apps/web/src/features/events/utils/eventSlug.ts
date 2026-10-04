const EVENT_SLUG_PATTERN = /^[0-9A-Za-z_-]{1,64}$/;

export function isWellFormedEventSlug(slug: string): boolean {
  return EVENT_SLUG_PATTERN.test(slug);
}

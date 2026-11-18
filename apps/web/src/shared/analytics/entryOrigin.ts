export type EntryOrigin = 'event' | 'recap' | 'list' | 'profile' | 'other';

const ORIGINS_BY_RETURN_PATH: ReadonlyArray<readonly [string, EntryOrigin]> = [
  ['/e/', 'event'],
  ['/r/', 'recap'],
  ['/l/', 'list'],
  ['/u/', 'profile'],
];

export function entryOriginOf(returnTo: string | null | undefined): EntryOrigin {
  if (!returnTo) return 'other';
  const match = ORIGINS_BY_RETURN_PATH.find(
    ([prefix]) => returnTo.startsWith(prefix) && returnTo.length > prefix.length
  );
  return match ? match[1] : 'other';
}

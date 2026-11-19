export type EntryOrigin = 'event' | 'recap' | 'list' | 'profile' | 'other';

const ORIGINS_BY_RETURN_PATH: ReadonlyArray<readonly [string, EntryOrigin]> = [
  ['/e/', 'event'],
  ['/r/', 'recap'],
  ['/l/', 'list'],
  ['/u/', 'profile'],
];

const DECLARED_ORIGIN_PARAMETER = 'from=';

function declaredOriginOf(returnTo: string): EntryOrigin {
  const query = returnTo.split('?')[1] ?? '';
  const declared = query
    .split('&')
    .find((parameter) => parameter.startsWith(DECLARED_ORIGIN_PARAMETER))
    ?.slice(DECLARED_ORIGIN_PARAMETER.length);
  const match = ORIGINS_BY_RETURN_PATH.find(([, origin]) => origin === declared);
  return match ? match[1] : 'other';
}

export function entryOriginOf(returnTo: string | null | undefined): EntryOrigin {
  if (!returnTo?.startsWith('/') || returnTo.startsWith('//')) return 'other';
  const match = ORIGINS_BY_RETURN_PATH.find(
    ([prefix]) => returnTo.startsWith(prefix) && returnTo.length > prefix.length
  );
  return match ? match[1] : declaredOriginOf(returnTo);
}

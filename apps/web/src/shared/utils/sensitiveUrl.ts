export const SENSITIVE_QUERY_PARAMETERS = ['host', 'token', 'api_key'] as const;

const SENSITIVE_QUERY_KEYS = new Set<string>(SENSITIVE_QUERY_PARAMETERS);

const RETURN_TO_KEY = 'returnto';

export const REDACTED_QUERY_VALUE = '***';

const URL_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;

const WHITESPACE_RUN = /(\s+)/;

const INVITE_PAGE_SEGMENTS = new Set(['l', 'g']);

const JOIN_API_RESOURCES = new Set(['lists', 'groups']);

const JOIN_API_SEGMENT = 'join';

function decodeQueryComponent(component: string): string {
  const withSpaces = component.replaceAll('+', ' ');
  try {
    return decodeURIComponent(withSpaces);
  } catch {
    return withSpaces;
  }
}

function sameSegment(segment: string | undefined, expected: string): boolean {
  return segment?.toLowerCase() === expected;
}

function isOneOf(segment: string | undefined, expected: ReadonlySet<string>): boolean {
  return segment !== undefined && expected.has(segment.toLowerCase());
}

function redactTokenSegments(segments: string[]): string[] {
  const redacted = [...segments];
  if (isOneOf(redacted[1], INVITE_PAGE_SEGMENTS) && redacted[2]) {
    redacted[2] = REDACTED_QUERY_VALUE;
  }
  for (let index = 0; index + 2 < redacted.length; index++) {
    if (
      isOneOf(redacted[index], JOIN_API_RESOURCES) &&
      sameSegment(redacted[index + 1], JOIN_API_SEGMENT) &&
      redacted[index + 2]
    ) {
      redacted[index + 2] = REDACTED_QUERY_VALUE;
    }
  }
  return redacted;
}

function pathStart(word: string): number {
  const scheme = URL_SCHEME.exec(word);
  if (!scheme) return word.startsWith('/') ? 0 : -1;
  const authorityEnd = word.slice(scheme[0].length).search(/[/?#]/);
  if (authorityEnd < 0) return -1;
  const start = scheme[0].length + authorityEnd;
  return word[start] === '/' ? start : -1;
}

function redactPathOf(word: string): string {
  const start = pathStart(word);
  if (start < 0) return word;
  const length = word.slice(start).search(/[?#]/);
  const end = length < 0 ? word.length : start + length;
  const path = redactTokenSegments(word.slice(start, end).split('/')).join('/');
  return `${word.slice(0, start)}${path}${word.slice(end)}`;
}

function redactPaths(value: string): string {
  return value.split(WHITESPACE_RUN).map(redactPathOf).join('');
}

function leadsToToken(encodedValue: string): boolean {
  const value = decodeQueryComponent(encodedValue);
  return redactSensitiveUrl(value) !== value;
}

function redactPair(pair: string): string {
  const separator = pair.indexOf('=');
  if (separator < 0) return pair;
  const key = pair.slice(0, separator);
  const decodedKey = decodeQueryComponent(key).toLowerCase();
  const sensitive =
    SENSITIVE_QUERY_KEYS.has(decodedKey) ||
    (decodedKey === RETURN_TO_KEY && leadsToToken(pair.slice(separator + 1)));
  return sensitive ? `${key}=${REDACTED_QUERY_VALUE}` : pair;
}

function redactQuery(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart < 0) return url;
  const fragmentStart = url.indexOf('#', queryStart);
  const queryEnd = fragmentStart < 0 ? url.length : fragmentStart;
  const query = url
    .slice(queryStart + 1, queryEnd)
    .split('&')
    .map(redactPair)
    .join('&');
  return `${url.slice(0, queryStart + 1)}${query}${url.slice(queryEnd)}`;
}

export function redactSensitiveUrl(url: string): string {
  return redactQuery(redactPaths(url));
}

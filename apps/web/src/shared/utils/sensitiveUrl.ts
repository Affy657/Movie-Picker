export const SENSITIVE_QUERY_PARAMETERS = ['host', 'token', 'api_key'] as const;

const SENSITIVE_QUERY_KEYS = new Set<string>(SENSITIVE_QUERY_PARAMETERS);

export const REDACTED_QUERY_VALUE = '***';

function decodedQueryKey(key: string): string {
  const withSpaces = key.replaceAll('+', ' ');
  try {
    return decodeURIComponent(withSpaces);
  } catch {
    return withSpaces;
  }
}

function redactPair(pair: string): string {
  const separator = pair.indexOf('=');
  if (separator < 0) return pair;
  const key = pair.slice(0, separator);
  return SENSITIVE_QUERY_KEYS.has(decodedQueryKey(key).toLowerCase())
    ? `${key}=${REDACTED_QUERY_VALUE}`
    : pair;
}

export function redactSensitiveUrl(url: string): string {
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

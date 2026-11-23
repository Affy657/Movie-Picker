const CHARSET_META = /<meta charset="UTF-8"\s*\/?>/i;

export function insertAfterCharset(html: string, tag: string): string {
  const charset = CHARSET_META.exec(html);
  if (!charset) {
    throw new Error('index.html: <meta charset> not found, nothing to place the tag after');
  }
  const end = charset.index + charset[0].length;
  return `${html.slice(0, end)}\n    ${tag}${html.slice(end)}`;
}

interface PreconnectTag {
  tag: 'link';
  attrs: { rel: 'preconnect'; href: string };
  injectTo: 'head-prepend';
}

export function apiPreconnectTags(apiOrigin: string): PreconnectTag[] {
  if (!apiOrigin) return [];
  return [{ tag: 'link', attrs: { rel: 'preconnect', href: apiOrigin }, injectTo: 'head-prepend' }];
}

export function contentSecurityPolicyMeta(policy: string): string {
  const content = policy.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return `<meta http-equiv="Content-Security-Policy" content="${content}">`;
}

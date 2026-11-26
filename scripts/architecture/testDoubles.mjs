import { isTestFile } from './sources.mjs';

const HAND_WRITTEN_JSON_RESPONSE_RE = /\bHttpResponse\.json\s*\(/g;

export function handWrittenJsonResponseViolations(path, source) {
  if (!isTestFile(path)) return [];
  return [...source.matchAll(HAND_WRITTEN_JSON_RESPONSE_RE)].map((match) => {
    const line = source.slice(0, match.index).split('\n').length;
    return `${path}:${line}: hand-written HttpResponse.json(, answer with apiJson<'XResponse'>(payload) or apiErrorJson(status, reason) of apps/web/src/mocks/apiJson.ts so the contract types the fake`;
  });
}

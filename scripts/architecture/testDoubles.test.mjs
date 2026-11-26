import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handWrittenJsonResponseViolations } from './testDoubles.mjs';

const TEST = 'apps/web/src/features/events/pages/Probe.test.tsx';

describe('fake API answers of the front tests', () => {
  it('refuses a JSON answer written by hand in a test, with its line', () => {
    const source = [
      'http.get(url, () => HttpResponse.json({ items: [] }));',
      'http.post(url, () => HttpResponse.json ({}, { status: 409 }));',
    ].join('\n');

    const violations = handWrittenJsonResponseViolations(TEST, source);

    assert.equal(violations.length, 2);
    assert.match(violations[0], /Probe\.test\.tsx:1: hand-written HttpResponse\.json\(/);
    assert.match(violations[1], /Probe\.test\.tsx:2:/);
  });

  it('accepts the typed helpers, an empty answer and the helpers themselves', () => {
    const source = [
      "http.get(url, () => apiJson<'WatchlistResponse'>({ items: [], total: 0, hasMore: false }));",
      "http.post(url, () => apiErrorJson(409, 'list_full', { max: 500 }));",
      'http.delete(url, () => new HttpResponse(null, { status: 204 }));',
    ].join('\n');

    assert.deepEqual(handWrittenJsonResponseViolations(TEST, source), []);
    assert.deepEqual(
      handWrittenJsonResponseViolations(
        'apps/web/src/mocks/apiJson.ts',
        'return HttpResponse.json(payload, init);'
      ),
      []
    );
  });
});

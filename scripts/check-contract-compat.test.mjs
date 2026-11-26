import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_REMOVALS,
  allowedRemovalReleases,
  applyAllowedRemovals,
  findBreakingChangeRecords,
  findBreakingChanges,
  latestReleaseTag,
  parseContract,
  tagFetchArgs,
} from './check-contract-compat.mjs';
import { parseAfter } from './removal-dates.mjs';

function json(schema) {
  return `{ headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["${schema}"] } }`;
}

function contract({ paths, schemas }) {
  const pathItems = Object.entries(paths)
    .map(([path, methods]) => {
      const operations = Object.entries(methods)
        .map(([method, responses]) => {
          const byStatus = Object.entries(responses)
            .map(
              ([status, schema]) =>
                `${status}: ${schema ? json(schema) : '{ headers: { [name: string]: unknown }; content?: never }'};`
            )
            .join(' ');
          return `${method}: { parameters: { query?: never }; requestBody?: never; responses: { ${byStatus} } };`;
        })
        .join(' ');
      return `"${path}": { parameters: { query?: never }; get?: never; delete?: never; ${operations} };`;
    })
    .join('\n');
  const components = Object.entries(schemas)
    .map(([name, body]) => `${name}: ${body};`)
    .join('\n');
  return `export interface paths {\n${pathItems}\n}\nexport interface components {\n schemas: {\n${components}\n };\n responses: never;\n}\n`;
}

const PUBLISHED = contract({
  paths: {
    '/api/v1/lists': { get: { 200: 'ListsResponse', 401: 'ProblemDetails' } },
    '/api/v1/lists/{id}': { post: { 201: 'ListResponse' } },
  },
  schemas: {
    ListsResponse: '{ items?: components["schemas"]["ListResponse"][] | null }',
    ListResponse: '{ id: string; name?: string | null; owner?: components["schemas"]["Person"] }',
    Person: '{ handle?: string | null; displayName: string }',
    ProblemDetails: '{ type?: string | null; title?: string | null }',
  },
});

function breaksBetween(published, current) {
  return findBreakingChanges(parseContract(published), parseContract(current));
}

describe('findBreakingChanges', () => {
  it('passes a contract that serves the same routes and fields', () => {
    assert.deepEqual(breaksBetween(PUBLISHED, PUBLISHED), []);
  });

  it('passes fields that became required and an error envelope that changed', () => {
    const hardened = contract({
      paths: {
        '/api/v1/lists': { get: { 200: 'ListsResponse', 401: 'ApiErrorResponse' } },
        '/api/v1/lists/{id}': { post: { 201: 'ListResponse' } },
      },
      schemas: {
        ListsResponse: '{ items: components["schemas"]["ListResponse"][] }',
        ListResponse:
          '{ id: string; name: string; owner?: components["schemas"]["Person"]; isPublic: boolean }',
        Person: '{ handle?: string | null; displayName: string }',
        ApiErrorResponse: '{ error: string; code: number }',
      },
    });

    assert.deepEqual(breaksBetween(PUBLISHED, hardened), []);
  });

  it('flags a removed path and a removed method', () => {
    const current = contract({
      paths: { '/api/v1/lists/{id}': { get: { 200: 'ListResponse' } } },
      schemas: {
        ListResponse:
          '{ id: string; name?: string | null; owner?: components["schemas"]["Person"] }',
        Person: '{ handle?: string | null; displayName: string }',
      },
    });

    assert.deepEqual(breaksBetween(PUBLISHED, current), [
      'GET /api/v1/lists: operation removed',
      'POST /api/v1/lists/{id}: operation removed',
    ]);
  });

  it('passes a path parameter that was only renamed, the front calling the same URL', () => {
    const renamed = contract({
      paths: {
        '/api/v1/lists': { get: { 200: 'ListsResponse', 401: 'ProblemDetails' } },
        '/api/v1/lists/{listId}': { post: { 201: 'ListResponse' } },
      },
      schemas: {
        ListsResponse: '{ items?: components["schemas"]["ListResponse"][] | null }',
        ListResponse:
          '{ id: string; name?: string | null; owner?: components["schemas"]["Person"] }',
        Person: '{ handle?: string | null; displayName: string }',
        ProblemDetails: '{ type?: string | null; title?: string | null }',
      },
    });

    assert.deepEqual(breaksBetween(PUBLISHED, renamed), []);
  });

  it('still flags a route whose parameter moved to another segment', () => {
    const moved = contract({
      paths: {
        '/api/v1/lists': { get: { 200: 'ListsResponse', 401: 'ProblemDetails' } },
        '/api/v1/lists/by/{id}': { post: { 201: 'ListResponse' } },
      },
      schemas: {
        ListsResponse: '{ items?: components["schemas"]["ListResponse"][] | null }',
        ListResponse:
          '{ id: string; name?: string | null; owner?: components["schemas"]["Person"] }',
        Person: '{ handle?: string | null; displayName: string }',
        ProblemDetails: '{ type?: string | null; title?: string | null }',
      },
    });

    assert.deepEqual(breaksBetween(PUBLISHED, moved), [
      'POST /api/v1/lists/{id}: operation removed',
    ]);
  });

  it('flags a removed response property, nested ones through arrays and references included', () => {
    const current = contract({
      paths: {
        '/api/v1/lists': { get: { 200: 'ListsResponse' } },
        '/api/v1/lists/{id}': { post: { 201: 'ListResponse' } },
      },
      schemas: {
        ListsResponse: '{ items?: components["schemas"]["ListResponse"][] | null }',
        ListResponse: '{ id: string; owner?: components["schemas"]["Person"] }',
        Person: '{ handle?: string | null }',
      },
    });

    assert.deepEqual(breaksBetween(PUBLISHED, current), [
      'GET /api/v1/lists 200.items[].name: property removed',
      'GET /api/v1/lists 200.items[].owner.displayName: property removed',
    ]);
  });

  it('flags a required response property that became optional', () => {
    const current = PUBLISHED.replace('{ id: string;', '{ id?: string;');

    assert.deepEqual(breaksBetween(PUBLISHED, current), [
      'GET /api/v1/lists 200.items[].id: property became optional',
    ]);
  });

  it('flags a response body the operation no longer returns', () => {
    const current = contract({
      paths: {
        '/api/v1/lists': { get: { 200: 'ListsResponse' } },
        '/api/v1/lists/{id}': { post: { 204: null } },
      },
      schemas: {
        ListsResponse: '{ items?: components["schemas"]["ListResponse"][] | null }',
        ListResponse:
          '{ id: string; name?: string | null; owner?: components["schemas"]["Person"] }',
        Person: '{ handle?: string | null; displayName: string }',
      },
    });

    assert.deepEqual(breaksBetween(PUBLISHED, current), [
      'POST /api/v1/lists/{id} 201: response body removed',
    ]);
  });

  it('flags a response property whose type changed, nested ones included', () => {
    const current = PUBLISHED.replace('{ id: string;', '{ id: number;').replace(
      'owner?: components["schemas"]["Person"] }',
      'owner?: string }'
    );

    assert.deepEqual(breaksBetween(PUBLISHED, current), [
      'GET /api/v1/lists 200.items[].id: type changed from string to number',
      'GET /api/v1/lists 200.items[].owner: type changed from object to string',
    ]);
  });

  it('flags a response property that may now be null', () => {
    const current = PUBLISHED.replace('displayName: string }', 'displayName: string | null }');

    assert.deepEqual(breaksBetween(PUBLISHED, current), [
      'GET /api/v1/lists 200.items[].owner.displayName: may now be null',
    ]);
  });

  it('passes a free string narrowed to the enum of its values and a property that lost its null', () => {
    const current = contract({
      paths: {
        '/api/v1/lists': { get: { 200: 'ListsResponse' } },
        '/api/v1/lists/{id}': { post: { 201: 'ListResponse' } },
      },
      schemas: {
        ListsResponse: '{ items: components["schemas"]["ListResponse"][] }',
        ListResponse:
          '{ id: "a" | "b"; name: components["schemas"]["ListName"]; owner?: components["schemas"]["Person"] }',
        ListName: '"first" | "second"',
        Person: '{ handle?: string | null; displayName: string }',
      },
    });

    assert.deepEqual(breaksBetween(PUBLISHED, current), []);
  });

  it('compares a success response moved to another status with the body it serves now', () => {
    const current = PUBLISHED.replace('responses: { 201:', 'responses: { 200:');

    assert.notEqual(current, PUBLISHED);
    assert.deepEqual(breaksBetween(PUBLISHED, current), []);
  });
});

describe('applyAllowedRemovals', () => {
  const WITHOUT_NAME = PUBLISHED.replace('name?: string | null; ', '');
  const NAME_GOES = [
    {
      schema: 'ListResponse',
      properties: ['name'],
      after: { date: '2027-01-15' },
      why: 'no front in circulation reads it any more',
    },
  ];

  function check(current, { today = '2027-01-15', allowed = NAME_GOES, releaseDates } = {}) {
    const published = parseContract(PUBLISHED);
    return applyAllowedRemovals(
      findBreakingChangeRecords(published, parseContract(current)),
      allowed,
      { published, today, releaseDates: releaseDates ?? new Map() }
    );
  }

  it('lets a listed property go once its date has come', () => {
    assert.notEqual(WITHOUT_NAME, PUBLISHED);
    assert.deepEqual(check(WITHOUT_NAME), {
      breaks: [],
      allowed: ['GET /api/v1/lists 200.items[].name'],
      stale: [],
    });
  });

  it('keeps the break before the date and says when the removal is allowed', () => {
    assert.deepEqual(check(WITHOUT_NAME, { today: '2027-01-14' }).breaks, [
      'GET /api/v1/lists 200.items[].name: property removed (ALLOWED_REMOVALS lets it go on 2027-01-15, fixed date)',
    ]);
  });

  it('keeps the break while the release it waits for has not reached production', () => {
    const allowed = [{ ...NAME_GOES[0], after: { release: 'v1.32.1', days: 30 } }];

    assert.deepEqual(
      check(WITHOUT_NAME, {
        allowed,
        today: '2030-01-01',
        releaseDates: new Map([['v1.32.1', { unpublished: true }]]),
      }).breaks,
      [
        'GET /api/v1/lists 200.items[].name: property removed (ALLOWED_REMOVALS lets it go 30 days after v1.32.1 reaches production, not there yet)',
      ]
    );
  });

  it('lets only the listed properties of the listed schema go', () => {
    const current = WITHOUT_NAME.replace(
      '{ handle?: string | null; displayName: string }',
      '{ handle?: string | null }'
    );

    assert.deepEqual(check(current).breaks, [
      'GET /api/v1/lists 200.items[].owner.displayName: property removed',
    ]);
  });

  it('never lets a listed property change its type', () => {
    const current = PUBLISHED.replace('name?: string | null;', 'name?: number | null;');

    assert.deepEqual(check(current).breaks, [
      'GET /api/v1/lists 200.items[].name: type changed from string to number',
    ]);
  });

  it('reports an allowed removal the published contract no longer serves', () => {
    const allowed = [
      { ...NAME_GOES[0], properties: ['name', 'nickname'] },
      { ...NAME_GOES[0], schema: 'Gone', properties: ['flag'] },
    ];

    assert.deepEqual(check(PUBLISHED, { allowed }).stale, ['ListResponse.nickname', 'Gone.flag']);
  });
});

describe('allowedRemovalReleases', () => {
  it('asks for a production date only when the contract drops an allowed property', () => {
    const published = parseContract(PUBLISHED);
    const allowed = [
      {
        schema: 'ListResponse',
        properties: ['name'],
        after: { release: 'v1.32.1', days: 30 },
        why: 'no front in circulation reads it any more',
      },
    ];
    const dropped = findBreakingChangeRecords(
      published,
      parseContract(PUBLISHED.replace('name?: string | null; ', ''))
    );

    assert.deepEqual(
      allowedRemovalReleases(findBreakingChangeRecords(published, published), allowed),
      []
    );
    assert.deepEqual(allowedRemovalReleases(dropped, allowed), [{ release: 'v1.32.1', days: 30 }]);
  });
});

describe('ALLOWED_REMOVALS', () => {
  it('gives each entry a schema, properties, a reason and a date the check can read', () => {
    for (const entry of ALLOWED_REMOVALS) {
      assert.match(entry.schema, /^\w+$/);
      assert.ok(entry.properties.length > 0);
      assert.ok(entry.why.trim().length > 0);
      assert.doesNotThrow(() => parseAfter(entry.after, entry.schema));
    }
  });
});

describe('latestReleaseTag', () => {
  it('picks the highest version among the tags origin lists', () => {
    const output = [
      'a1\trefs/tags/v1.9.9',
      'b2\trefs/tags/v1.10.0',
      'c3\trefs/tags/v1.10.0-rc',
      'd4\trefs/tags/v0.20.1',
      '',
    ].join('\n');

    assert.equal(latestReleaseTag(output), 'v1.10.0');
  });

  it('returns null when origin has no release tag', () => {
    assert.equal(latestReleaseTag(''), null);
  });
});

describe('tagFetchArgs', () => {
  it('fetches only the tagged commit in the shallow checkout of the CI', () => {
    assert.deepEqual(tagFetchArgs('v1.16.0', true), [
      'fetch',
      '--no-tags',
      '--quiet',
      '--depth=1',
      'origin',
      'refs/tags/v1.16.0:refs/tags/v1.16.0',
    ]);
  });

  it('never makes a full clone shallow', () => {
    assert.deepEqual(tagFetchArgs('v1.16.0', false), [
      'fetch',
      '--no-tags',
      '--quiet',
      'origin',
      'refs/tags/v1.16.0:refs/tags/v1.16.0',
    ]);
  });
});

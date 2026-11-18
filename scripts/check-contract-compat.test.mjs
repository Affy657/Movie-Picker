import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findBreakingChanges, latestReleaseTag, parseContract } from './check-contract-compat.mjs';

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

  it('compares a success response moved to another status with the body it serves now', () => {
    const current = PUBLISHED.replace('responses: { 201:', 'responses: { 200:');

    assert.notEqual(current, PUBLISHED);
    assert.deepEqual(breaksBetween(PUBLISHED, current), []);
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

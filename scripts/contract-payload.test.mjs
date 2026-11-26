import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseContract } from './check-contract-compat.mjs';
import { findPayloadMismatches, loadContract, responseType } from './contract-payload.mjs';

const CONTRACT = parseContract(`export interface paths {
  "/api/v1/users/{handle}": {
    parameters: { query?: never };
    get: {
      parameters: { query?: never };
      requestBody?: never;
      responses: {
        200: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["Profile"] } };
        404: { headers: { [name: string]: unknown }; content: { "application/json": components["schemas"]["ApiErrorResponse"] } };
      };
    };
  };
}
export interface components {
  schemas: {
    Profile: {
      handle: string;
      bio: string | null;
      watchlistCount: number | null;
      isSupporter: boolean;
      accentColor: components["schemas"]["AccentColor"];
      favorites: components["schemas"]["Favorite"][];
      banner: components["schemas"]["Banner"] | null;
      flags: { [key: string]: boolean };
      exportedOnly?: string;
    };
    Favorite: { tmdbId: number; title: string };
    Banner: { imageUrl: string };
    AccentColor: "default" | "blue";
    ApiErrorResponse: { message: string };
  };
  responses: never;
}
`);

const PROFILE = {
  handle: 'lea',
  bio: null,
  watchlistCount: 3,
  isSupporter: false,
  accentColor: 'blue',
  favorites: [{ tmdbId: 1, title: 'Alien' }],
  banner: null,
  flags: { a: true },
};

function mismatches(value) {
  return findPayloadMismatches(
    CONTRACT,
    responseType(CONTRACT, 'GET', '/api/v1/users/{handle}'),
    value
  );
}

describe('findPayloadMismatches', () => {
  it('accepts a payload that carries every required field with its declared type', () => {
    assert.deepEqual(mismatches(PROFILE), []);
  });

  it('reports a required field the payload leaves out', () => {
    const partial = { ...PROFILE };
    delete partial.watchlistCount;
    delete partial.banner;
    assert.deepEqual(mismatches(partial), ['$.watchlistCount: missing', '$.banner: missing']);
  });

  it('reports a null where the contract does not allow one, and accepts it where it does', () => {
    assert.deepEqual(mismatches({ ...PROFILE, handle: null, bio: null }), [
      '$.handle: null where the contract does not allow it',
    ]);
  });

  it('reports a value of the wrong type, inside arrays and referenced schemas too', () => {
    assert.deepEqual(
      mismatches({ ...PROFILE, isSupporter: 'no', favorites: [{ tmdbId: '1', title: 'Alien' }] }),
      [
        '$.isSupporter: expected boolean, got string',
        '$.favorites[0].tmdbId: expected number, got string',
      ]
    );
  });

  it('reports a value outside an enumeration', () => {
    assert.deepEqual(mismatches({ ...PROFILE, accentColor: 'mauve' }), [
      '$.accentColor: "mauve" is not one of "default", "blue"',
    ]);
  });

  it('reports a field the contract does not declare, so a stub cannot invent one', () => {
    assert.deepEqual(mismatches({ ...PROFILE, legacyField: 1 }), [
      '$.legacyField: not in the contract',
    ]);
  });

  it('checks the values of a map against its index signature', () => {
    assert.deepEqual(mismatches({ ...PROFILE, flags: { a: 'yes' } }), [
      '$.flags.a: expected boolean, got string',
    ]);
  });

  it('refuses an operation or a status the contract does not serve', () => {
    assert.throws(() => responseType(CONTRACT, 'GET', '/api/v1/nowhere'), /not in the contract/);
    assert.throws(
      () => responseType(CONTRACT, 'GET', '/api/v1/users/{handle}', '201'),
      /no 201 JSON body/
    );
  });

  it('reads the contract the front is generated from', () => {
    const contract = loadContract();
    assert.ok(responseType(contract, 'GET', '/api/v1/users/{handle}'));
  });
});

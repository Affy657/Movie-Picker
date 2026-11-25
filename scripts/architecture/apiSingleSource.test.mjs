import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_SOURCE_DIR,
  FRONT_ROUTES_CS,
  GENERIC_API_ERRORS_CS,
  frontPathViolations,
  frontPathsIn,
  genericErrorMessageViolations,
} from './apiSingleSource.mjs';

const HANDLER = `${API_SOURCE_DIR}Application/UseCases/Probe/ProbeHandler.cs`;

const FRONT_ROUTES = [
  'public static class FrontRoutes',
  '{',
  '    public const string Home = "/";',
  '    public const string Login = "/login";',
  '    public const string Groups = "/groupes";',
  '    public const string EventDetailPattern = "/e/:slug";',
  '    public const string GroupJoinPattern = "/g/:token/rejoindre";',
  '    public const string ReturnToQueryParam = "returnTo";',
  '}',
].join('\n');

const GENERIC_ERRORS = [
  'public static class GenericApiErrors',
  '{',
  '    private const string AccessDenied = "Access denied";',
  '    private const string TooManyRequests = "Too many requests, please retry in a moment";',
  '}',
].join('\n');

const checkPaths = (text, path = HANDLER) =>
  frontPathViolations(new Map([[path, text]]), FRONT_ROUTES);

const checkMessages = (text, path = HANDLER) =>
  genericErrorMessageViolations(new Map([[path, text]]), GENERIC_ERRORS);

describe('front paths', () => {
  it('reads each path of FrontRoutes, a pattern up to its first parameter, without the home page', () => {
    assert.deepEqual(frontPathsIn(FRONT_ROUTES), ['/login', '/groupes', '/e/', '/g/']);
  });

  it('refuses a front path written again outside FrontRoutes', () => {
    assert.deepEqual(checkPaths('        var url = $"/e/{evt.Slug}";'), [
      `${HANDLER}:1: "/e/{evt.Slug}" writes the front path /e/ again, build it from FrontRoutes (AGENTS.md, FrontRoutes)`,
    ]);
    assert.equal(checkPaths('        ("/e/", "event"),').length, 1);
    assert.equal(checkPaths('        return Redirect("/login?oauthError=x");').length, 1);
    assert.equal(checkPaths('        var path = "/groupes";').length, 1);
    assert.equal(checkPaths('        var path = @"/groupes/abc";').length, 1);
  });

  it('accepts FrontRoutes itself, an API route and a path that only shares a prefix', () => {
    assert.deepEqual(checkPaths(FRONT_ROUTES, FRONT_ROUTES_CS), []);
    assert.deepEqual(checkPaths('[Route(ApiRoutePrefix.V1 + "/login")]'), []);
    assert.deepEqual(checkPaths('    [HttpGet("/groupes")]'), []);
    assert.deepEqual(
      checkPaths(
        [
          'var home = "/";',
          'var api = "/events/abc";',
          'var other = "/loginx";',
          'var key = "returnTo";',
          'var path = FrontRoutes.EventDetail(slug);',
        ].join('\n')
      ),
      []
    );
  });

  it('fails when FrontRoutes declares no path any more', () => {
    assert.equal(frontPathViolations(new Map(), 'public static class FrontRoutes {}').length, 1);
  });
});

describe('generic error messages', () => {
  it('refuses a generic message written again outside its table', () => {
    assert.deepEqual(checkMessages('            "Access denied",'), [
      `${HANDLER}:1: "Access denied" writes a generic error message again, take it from GenericApiErrors (AGENTS.md, GenericApiErrors)`,
    ]);
    assert.equal(
      checkMessages(
        '    public NotFoundException(string message = "Too many requests, please retry in a moment")'
      ).length,
      1
    );
  });

  it('accepts the table itself and any other message', () => {
    assert.deepEqual(checkMessages(GENERIC_ERRORS, GENERIC_API_ERRORS_CS), []);
    assert.deepEqual(checkMessages('new("Only the host can do this", ErrorCodes.HostOnly)'), []);
    assert.deepEqual(checkMessages('var reason = GenericApiErrors.Describe(403);'), []);
  });

  it('fails when the table declares no message any more', () => {
    assert.equal(
      genericErrorMessageViolations(new Map(), 'public static class GenericApiErrors {}').length,
      1
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { apiLayerViolations } from './apiLayers.mjs';

describe('API layers', () => {
  const file = 'apps/api-dotnet/MoviePicker.Api/Application/Probe.cs';

  it('refuses a plain, static and global using', () => {
    const text = [
      'using MongoDB.Driver;',
      'using static MongoDB.Driver.Builders;',
      'global using Microsoft.AspNetCore.Http;',
    ].join('\n');

    assert.equal(apiLayerViolations('Application', file, text).length, 3);
  });

  it('refuses a namespace or a closed generic reached through an alias', () => {
    const text = [
      'using Driver = MongoDB.Driver;',
      'using Movies = MongoDB.Driver.IMongoCollection<MovieDocument>;',
      'using Rooted = global::MongoDB.Driver.MongoClient;',
    ].join('\n');

    assert.equal(apiLayerViolations('Application', file, text).length, 3);
  });

  it('refuses a fully qualified name in the code', () => {
    const text = [
      'public sealed class Probe(MongoDB.Driver.IMongoDatabase database)',
      '{',
      '    private readonly global::MoviePicker.Api.Infrastructure.Tmdb.TmdbClient client = null!;',
      '}',
    ].join('\n');

    assert.equal(apiLayerViolations('Application', file, text).length, 2);
  });

  it('ignores a statement, a string and a member chain', () => {
    const text = [
      'using System.Linq;',
      'public sealed class Probe',
      '{',
      '    public void Run()',
      '    {',
      '        using var scope = factory.Create();',
      '        using Stream stream = File.OpenRead("MongoDB.Driver.dll");',
      '        logger.LogWarning("Microsoft.AspNetCore.Http is unreachable");',
      '        var name = settings.MongoDB.Database;',
      '    }',
      '}',
    ].join('\n');

    assert.deepEqual(apiLayerViolations('Application', file, text), []);
  });

  it('keeps the allow-list of the domain, aliases included', () => {
    const text = 'using Clock = NodaTime.IClock;\nusing System.Text;\n';

    assert.equal(apiLayerViolations('Domain', file, text).length, 1);
  });

  it('lets a controller use the web framework but not the persistence', () => {
    const controller = 'apps/api-dotnet/MoviePicker.Api/Controllers/ProbeController.cs';
    const allowed = 'using Microsoft.AspNetCore.Mvc;\nusing MoviePicker.Api.Application.Ports;\n';
    const forbidden = 'using MoviePicker.Api.Infrastructure.Persistence.Mongo;\n';

    assert.deepEqual(apiLayerViolations('Controllers', controller, allowed), []);
    assert.equal(apiLayerViolations('Controllers', controller, forbidden).length, 1);
  });
});

using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;

namespace MoviePicker.Api.Infrastructure.Posters;

public sealed class MongoPosterImageStore : IPosterImageStore
{
    public const string CollectionName = "poster_cache";

    private readonly IMongoCollection<PosterCacheDocument> _col;
    private readonly IHttpClientFactory _httpFactory;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<MongoPosterImageStore> _logger;

    public MongoPosterImageStore(
        IMongoDatabase database,
        IHttpClientFactory httpFactory,
        IOptions<MoviePickerOptions> options,
        ILogger<MongoPosterImageStore> logger)
    {
        _col = database.GetCollection<PosterCacheDocument>(CollectionName);
        _httpFactory = httpFactory;
        _options = options.Value;
        _logger = logger;
    }

    public string? ToPublicPosterPath(string? posterUrl) => TmdbPosterUrlNormalizer.ToPublicPosterPath(posterUrl);

    public Task RegisterTmdbSourceAsync(string normalizedTmdbHttpsUrl, CancellationToken ct = default) =>
        RegisterTmdbSourcesAsync(new[] { normalizedTmdbHttpsUrl }, ct);

    public async Task RegisterTmdbSourcesAsync(IReadOnlyCollection<string> normalizedTmdbHttpsUrls, CancellationToken ct = default)
    {
        if (normalizedTmdbHttpsUrls.Count == 0)
            return;

        var distinct = normalizedTmdbHttpsUrls.Distinct(StringComparer.Ordinal).ToList();
        var expires = DateTime.UtcNow.AddDays(Math.Max(1, _options.PosterCacheTtlDays));
        var models = new List<WriteModel<PosterCacheDocument>>(distinct.Count);
        foreach (var norm in distinct)
        {
            if (!TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(norm, out var verified))
                continue;
            var key = TmdbPosterUrlNormalizer.ComputeKey(verified);
            var filter = Builders<PosterCacheDocument>.Filter.Eq(x => x.Id, key);
            var update = Builders<PosterCacheDocument>.Update
                .SetOnInsert(x => x.Id, key)
                .Set(x => x.SourceUrl, verified)
                .Set(x => x.ExpiresAtUtc, expires);
            models.Add(new UpdateOneModel<PosterCacheDocument>(filter, update) { IsUpsert = true });
        }

        if (models.Count == 0)
            return;

        await _col.BulkWriteAsync(models, new BulkWriteOptions { IsOrdered = false }, ct);
    }

    public async Task<PosterImageBlob?> GetByKeyAsync(string posterKey, CancellationToken ct = default)
    {
        var k = posterKey.ToLowerInvariant();
        if (!TmdbPosterUrlNormalizer.IsValidPosterKey(k))
            return null;

        var doc = await _col.Find(x => x.Id == k).FirstOrDefaultAsync(ct);
        if (doc is null)
            return null;

        var now = DateTime.UtcNow;
        if (doc.Data is { Length: > 0 } bytes
            && !string.IsNullOrWhiteSpace(doc.ContentType)
            && doc.ExpiresAtUtc > now)
            return new PosterImageBlob(bytes, doc.ContentType!);

        if (string.IsNullOrWhiteSpace(doc.SourceUrl)
            || !TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(doc.SourceUrl, out var source))
        {
            _logger.LogWarning("poster_cache entrée {Key} sans sourceUrl TMDB valide", k);
            return null;
        }

        try
        {
            var http = _httpFactory.CreateClient(PosterFetchHttp.ClientName);
            var blob = await PosterRemoteFetch.FetchAsync(http, source, _options.PosterCacheMaxBytes, ct);
            if (blob is null)
            {
                if (doc.Data is { Length: > 0 } stale && !string.IsNullOrWhiteSpace(doc.ContentType))
                    return new PosterImageBlob(stale, doc.ContentType!);
                return null;
            }

            var newExpires = DateTime.UtcNow.AddDays(Math.Max(1, _options.PosterCacheTtlDays));
            await _col.UpdateOneAsync(
                Builders<PosterCacheDocument>.Filter.Eq(x => x.Id, k),
                Builders<PosterCacheDocument>.Update
                    .Set(x => x.Data, blob.Data)
                    .Set(x => x.ContentType, blob.ContentType)
                    .Set(x => x.ExpiresAtUtc, newExpires),
                cancellationToken: ct);

            return blob;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Échec téléchargement affiche TMDB pour {Key}", k);
            if (doc.Data is { Length: > 0 } fallback && !string.IsNullOrWhiteSpace(doc.ContentType))
                return new PosterImageBlob(fallback, doc.ContentType!);
            return null;
        }
    }
}

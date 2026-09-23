using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;

namespace MoviePicker.Api.Infrastructure.Posters;

public sealed class MongoPosterImageStore : IPosterImageStore
{
    public const string CollectionName = "poster_cache";

    private readonly IMongoCollection<PosterCacheDocument> _col;
    private readonly SingleFlight _fetches = new();
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

    public async Task<PosterImageBlob?> GetOrFetchAsync(string normalizedTmdbHttpsUrl, CancellationToken ct = default)
    {
        if (!TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(normalizedTmdbHttpsUrl, out var source))
            return null;

        var key = TmdbPosterUrlNormalizer.ComputeKey(source);
        var doc = await _col.Find(x => x.Id == key).FirstOrDefaultAsync(ct);
        return FreshBlob(doc) ?? await _fetches.RunAsync(key, () => FetchAndStoreAsync(key, source, doc), ct);
    }

    public async Task<PosterImageBlob?> GetByKeyAsync(string posterKey, CancellationToken ct = default)
    {
        var key = posterKey.ToLowerInvariant();
        if (!TmdbPosterUrlNormalizer.IsValidPosterKey(key))
            return null;

        var doc = await _col.Find(x => x.Id == key).FirstOrDefaultAsync(ct);
        if (doc is null)
            return null;

        if (FreshBlob(doc) is { } fresh)
            return fresh;

        if (!TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(doc.SourceUrl, out var source))
        {
            _logger.LogWarning("poster_cache entry {Key} without a valid TMDB sourceUrl", doc.Id);
            return null;
        }

        return await _fetches.RunAsync(key, () => FetchAndStoreAsync(key, source, doc), ct);
    }

    public async Task<string?> FindSourceUrlAsync(string posterKey, CancellationToken ct = default)
    {
        var key = posterKey.ToLowerInvariant();
        var source = await _col
            .Find(x => x.Id == key)
            .Project(x => x.SourceUrl)
            .FirstOrDefaultAsync(ct);
        return string.IsNullOrWhiteSpace(source) ? null : source;
    }

    private static PosterImageBlob? FreshBlob(PosterCacheDocument? doc) =>
        doc is { Data.Length: > 0 } && !string.IsNullOrWhiteSpace(doc.ContentType) && doc.ExpiresAtUtc > DateTime.UtcNow
            ? new PosterImageBlob(doc.Data, doc.ContentType)
            : null;

    private static PosterImageBlob? StaleBlob(PosterCacheDocument? doc) =>
        doc is { Data.Length: > 0 } && !string.IsNullOrWhiteSpace(doc.ContentType)
            ? new PosterImageBlob(doc.Data, doc.ContentType)
            : null;

    private async Task<PosterImageBlob?> FetchAndStoreAsync(string key, string source, PosterCacheDocument? previous)
    {
        PosterImageBlob? blob;
        try
        {
            var http = _httpFactory.CreateClient(PosterFetchHttp.ClientName);
            blob = await PosterRemoteFetch.FetchAsync(http, source, _options.PosterCacheMaxBytes, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TMDB poster download failed from {Source}", source);
            return StaleBlob(previous);
        }

        if (blob is null)
            return StaleBlob(previous);

        try
        {
            if (previous is null && await _col.EstimatedDocumentCountAsync(cancellationToken: CancellationToken.None) >= _options.PosterCacheMaxEntries)
            {
                _logger.LogInformation("Poster cache full, poster {Key} served without being kept", key);
                return blob;
            }

            var expires = DateTime.UtcNow.AddDays(Math.Max(1, _options.PosterCacheTtlDays));
            await _col.UpdateOneAsync(
                Builders<PosterCacheDocument>.Filter.Eq(x => x.Id, key),
                Builders<PosterCacheDocument>.Update
                    .SetOnInsert(x => x.Id, key)
                    .Set(x => x.SourceUrl, source)
                    .Set(x => x.Data, blob.Data)
                    .Set(x => x.ContentType, blob.ContentType)
                    .Set(x => x.ExpiresAtUtc, expires),
                new UpdateOptions { IsUpsert = true },
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Poster {Key} served without being kept: the cache write failed", key);
        }

        return blob;
    }
}

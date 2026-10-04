using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Infrastructure.Posters;

public sealed class MemoryPosterImageStore : IPosterImageStore
{
    private sealed class Entry
    {
        public string SourceUrl { get; init; } = "";
        public byte[]? Data { get; init; }
        public string? ContentType { get; init; }
        public DateTime ExpiresAtUtc { get; init; }
    }

    private readonly ConcurrentDictionary<string, Entry> _entries = new(StringComparer.Ordinal);
    private readonly SingleFlight _fetches = new();
    private readonly IHttpClientFactory _httpFactory;
    private readonly MoviePickerOptions _options;
    private readonly ILogger<MemoryPosterImageStore> _logger;

    public MemoryPosterImageStore(
        IHttpClientFactory httpFactory,
        IOptions<MoviePickerOptions> options,
        ILogger<MemoryPosterImageStore> logger)
    {
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
        _entries.TryGetValue(key, out var entry);
        return FreshBlob(entry) ?? await _fetches.RunAsync(key, () => FetchAndStoreAsync(key, source, entry), ct);
    }

    public async Task<PosterImageBlob?> GetByKeyAsync(string posterKey, CancellationToken ct = default)
    {
        var key = posterKey.ToLowerInvariant();
        if (!TmdbPosterUrlNormalizer.IsValidPosterKey(key) || !_entries.TryGetValue(key, out var entry))
            return null;

        if (FreshBlob(entry) is { } fresh)
            return fresh;

        return TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(entry.SourceUrl, out var source)
            ? await _fetches.RunAsync(key, () => FetchAndStoreAsync(key, source, entry), ct)
            : null;
    }

    public Task<string?> FindSourceUrlAsync(string posterKey, CancellationToken ct = default) =>
        Task.FromResult(
            _entries.TryGetValue(posterKey.ToLowerInvariant(), out var entry) && !string.IsNullOrWhiteSpace(entry.SourceUrl)
                ? entry.SourceUrl
                : null);

    private static PosterImageBlob? FreshBlob(Entry? entry) =>
        entry is { Data.Length: > 0 } && !string.IsNullOrWhiteSpace(entry.ContentType) && entry.ExpiresAtUtc > DateTime.UtcNow
            ? new PosterImageBlob(entry.Data, entry.ContentType)
            : null;

    private static PosterImageBlob? StaleBlob(Entry? entry) =>
        entry is { Data.Length: > 0 } && !string.IsNullOrWhiteSpace(entry.ContentType)
            ? new PosterImageBlob(entry.Data, entry.ContentType)
            : null;

    private async Task<PosterImageBlob?> FetchAndStoreAsync(string key, string source, Entry? previous)
    {
        try
        {
            var http = _httpFactory.CreateClient(PosterFetchHttp.ClientName);
            var blob = await PosterRemoteFetch.FetchAsync(http, source, _options.PosterCacheMaxBytes, CancellationToken.None);
            if (blob is null)
                return StaleBlob(previous);

            if (previous is null && _entries.Count >= _options.PosterCacheMaxEntries)
                return blob;

            _entries[key] = new Entry
            {
                SourceUrl = source,
                Data = blob.Data,
                ContentType = blob.ContentType,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(Math.Max(1, _options.PosterCacheTtlDays))
            };
            return blob;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "TMDB poster download failed (memory) from {Source}", source);
            return StaleBlob(previous);
        }
    }
}

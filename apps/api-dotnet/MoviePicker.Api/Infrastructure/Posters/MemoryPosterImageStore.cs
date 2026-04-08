using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Configuration;

namespace MoviePicker.Api.Infrastructure.Posters;

/// <summary>Cache affiches en mémoire (processus) — sans MongoDB, ex. tests d’intégration ou dev local.</summary>
public sealed class MemoryPosterImageStore : IPosterImageStore
{
    private sealed class Entry
    {
        public string SourceUrl { get; set; } = "";
        public byte[]? Data { get; set; }
        public string? ContentType { get; set; }
        public DateTime ExpiresAtUtc { get; set; }
    }

    private readonly ConcurrentDictionary<string, Entry> _entries = new(StringComparer.Ordinal);
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

    public string? ToPublicPosterPath(string? posterUrl)
    {
        if (string.IsNullOrWhiteSpace(posterUrl))
            return posterUrl;

        var trimmed = posterUrl.Trim();
        if (TmdbPosterUrlNormalizer.TryParsePosterKey(trimmed, out var parsedKey))
            return TmdbPosterUrlNormalizer.ApiPosterPathPrefix + parsedKey;

        if (!TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(trimmed, out var normalized))
            return posterUrl;

        var key = TmdbPosterUrlNormalizer.ComputeKey(normalized);
        return TmdbPosterUrlNormalizer.ApiPosterPathPrefix + key;
    }

    public Task RegisterTmdbSourceAsync(string normalizedTmdbHttpsUrl, CancellationToken ct = default) =>
        RegisterTmdbSourcesAsync(new[] { normalizedTmdbHttpsUrl }, ct);

    public Task RegisterTmdbSourcesAsync(IReadOnlyCollection<string> normalizedTmdbHttpsUrls, CancellationToken ct = default)
    {
        if (normalizedTmdbHttpsUrls.Count == 0)
            return Task.CompletedTask;

        var expires = DateTime.UtcNow.AddDays(Math.Max(1, _options.PosterCacheTtlDays));
        foreach (var norm in normalizedTmdbHttpsUrls.Distinct(StringComparer.Ordinal))
        {
            if (!TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(norm, out var verified))
                continue;
            var key = TmdbPosterUrlNormalizer.ComputeKey(verified);
            _entries.AddOrUpdate(
                key,
                _ => new Entry { SourceUrl = verified, ExpiresAtUtc = expires },
                (_, existing) =>
                {
                    existing.SourceUrl = verified;
                    existing.ExpiresAtUtc = expires;
                    return existing;
                });
        }

        return Task.CompletedTask;
    }

    public async Task<PosterImageBlob?> GetByKeyAsync(string posterKey, CancellationToken ct = default)
    {
        var k = posterKey.ToLowerInvariant();
        if (!TmdbPosterUrlNormalizer.IsValidPosterKey(k))
            return null;

        if (!_entries.TryGetValue(k, out var entry))
            return null;

        var now = DateTime.UtcNow;
        if (entry.Data is { Length: > 0 } bytes
            && !string.IsNullOrWhiteSpace(entry.ContentType)
            && entry.ExpiresAtUtc > now)
            return new PosterImageBlob(bytes, entry.ContentType!);

        if (string.IsNullOrWhiteSpace(entry.SourceUrl)
            || !TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(entry.SourceUrl, out var source))
            return null;

        try
        {
            var http = _httpFactory.CreateClient(PosterFetchHttp.ClientName);
            var blob = await PosterRemoteFetch.FetchAsync(http, source, _options.PosterCacheMaxBytes, ct);
            if (blob is null)
            {
                if (entry.Data is { Length: > 0 } stale && !string.IsNullOrWhiteSpace(entry.ContentType))
                    return new PosterImageBlob(stale, entry.ContentType!);
                return null;
            }

            entry.Data = blob.Data;
            entry.ContentType = blob.ContentType;
            entry.ExpiresAtUtc = DateTime.UtcNow.AddDays(Math.Max(1, _options.PosterCacheTtlDays));
            return blob;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Échec téléchargement affiche TMDB (mémoire) pour {Key}", k);
            if (entry.Data is { Length: > 0 } fallback && !string.IsNullOrWhiteSpace(entry.ContentType))
                return new PosterImageBlob(fallback, entry.ContentType!);
            return null;
        }
    }
}

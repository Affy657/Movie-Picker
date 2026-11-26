using System.Collections.Concurrent;
using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed partial class TmdbMovieSearch
{
    public async Task<TmdbMovieEnrichment?> GetEnrichmentAsync(
        int tmdbId,
        MovieMediaType mediaType,
        string region,
        CatalogLanguage language,
        CancellationToken ct = default)
    {
        if (!_options.HasTmdbCredentials)
            return null;

        var catalog = new EnrichmentCatalog(WatchRegion.Of(region), language);
        var cacheKey = EnrichmentCacheKey(tmdbId, mediaType, catalog);

        if (TryGetEnrichmentFromMemory(cacheKey, out var cached))
            return cached;

        var shared = await _sharedCache.TryGetAsync<TmdbMovieEnrichment>(cacheKey, ct).ConfigureAwait(false);
        if (shared is not null)
        {
            _cache.Set(cacheKey, shared.Value, new MemoryCacheEntryOptions { AbsoluteExpiration = shared.ExpiresAt, Size = 1 });
            return shared.Value;
        }

        return await FetchEnrichmentThroughCachesAsync(tmdbId, mediaType, catalog, cacheKey, ct).ConfigureAwait(false);
    }

    public async Task<IReadOnlyDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>> GetEnrichmentsAsync(
        IReadOnlyCollection<(int TmdbId, MovieMediaType MediaType)> keys,
        string region,
        CatalogLanguage language,
        CancellationToken ct = default)
    {
        var result = new ConcurrentDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>();
        if (!_options.HasTmdbCredentials || keys.Count == 0)
            return result;

        var catalog = new EnrichmentCatalog(WatchRegion.Of(region), language);
        var misses = new List<(int TmdbId, MovieMediaType MediaType, string CacheKey)>();
        foreach (var key in keys.Distinct())
        {
            var cacheKey = EnrichmentCacheKey(key.TmdbId, key.MediaType, catalog);
            if (TryGetEnrichmentFromMemory(cacheKey, out var cached))
                result[key] = cached;
            else
                misses.Add((key.TmdbId, key.MediaType, cacheKey));
        }
        if (misses.Count == 0)
            return result;

        var shared = await _sharedCache
            .TryGetManyAsync<TmdbMovieEnrichment>(misses.Select(m => m.CacheKey).ToList(), ct)
            .ConfigureAwait(false);
        var toFetch = new List<(int TmdbId, MovieMediaType MediaType, string CacheKey)>();
        foreach (var miss in misses)
        {
            if (shared.TryGetValue(miss.CacheKey, out var entry))
            {
                _cache.Set(miss.CacheKey, entry.Value, new MemoryCacheEntryOptions { AbsoluteExpiration = entry.ExpiresAt, Size = 1 });
                result[(miss.TmdbId, miss.MediaType)] = entry.Value;
            }
            else
            {
                toFetch.Add(miss);
            }
        }
        if (toFetch.Count == 0)
            return result;

        var budget = Math.Clamp(_options.TmdbBatchEnrichmentMaxFetch, 1, MaxBatchEnrichmentFetch);
        var parallel = Math.Clamp(_options.TmdbListEnrichmentMaxParallelism, 1, 16);
        await Parallel.ForEachAsync(
                toFetch.Take(budget),
                new ParallelOptions { MaxDegreeOfParallelism = parallel, CancellationToken = ct },
                async (miss, c) =>
                {
                    result[(miss.TmdbId, miss.MediaType)] = await FetchEnrichmentThroughCachesAsync(
                        miss.TmdbId, miss.MediaType, catalog, miss.CacheKey, c).ConfigureAwait(false);
                })
            .ConfigureAwait(false);
        return result;
    }

    private const int MaxBatchEnrichmentFetch = 500;

    private sealed record EnrichmentCatalog(string Region, CatalogLanguage Language);

    private static string EnrichmentCacheKey(int tmdbId, MovieMediaType mediaType, EnrichmentCatalog catalog) =>
        $"tmdb-enrich-v3:{MediaTypeSegment(mediaType)}:{catalog.Region}:{catalog.Language.TmdbCode()}:{tmdbId}";

    private bool TryGetEnrichmentFromMemory(string cacheKey, out TmdbMovieEnrichment? enrichment)
    {
        enrichment = null;
        if (!_cache.TryGetValue(cacheKey, out object? boxed))
            return false;
        if (boxed is TmdbMovieEnrichment cached)
        {
            enrichment = cached;
            return true;
        }
        return boxed is TmdbUnavailableMarker;
    }

    private async Task<TmdbMovieEnrichment?> FetchEnrichmentThroughCachesAsync(
        int tmdbId,
        MovieMediaType mediaType,
        EnrichmentCatalog catalog,
        string cacheKey,
        CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        return await _singleFlight
            .RunAsync(cacheKey, () => FetchAndStoreEnrichmentAsync(tmdbId, mediaType, catalog, cacheKey), ct)
            .ConfigureAwait(false);
    }

    private async Task<TmdbMovieEnrichment?> FetchAndStoreEnrichmentAsync(
        int tmdbId,
        MovieMediaType mediaType,
        EnrichmentCatalog catalog,
        string cacheKey)
    {
        var ttl = TimeSpan.FromHours(Math.Clamp(_options.TmdbEnrichmentCacheHours, 1, 168));
        try
        {
            var fresh = await FetchEnrichmentUncachedAsync(tmdbId, mediaType, catalog, CancellationToken.None).ConfigureAwait(false);
            _cache.Set(cacheKey, fresh, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl, Size = 1 });
            await _sharedCache
                .SetWithinCapacityAsync(cacheKey, fresh, ttl, _options.TmdbEnrichmentSharedCacheMaxEntries, CancellationToken.None)
                .ConfigureAwait(false);
            return fresh;
        }
        catch (Exception ex) when (
            ex is HttpRequestException
                or TaskCanceledException
                or JsonException
                or InvalidOperationException
                or FormatException)
        {
            _logger.LogWarning(
                ex,
                "TMDB enrichment failed for {MediaType} {TmdbId} region {Region} language {Language}",
                MediaTypeSegment(mediaType),
                tmdbId,
                catalog.Region,
                catalog.Language.TmdbCode());
            _cache.Set(
                cacheKey,
                TmdbUnavailableMarker.Instance,
                new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = FailureCacheTtl(), Size = 1 });
            return null;
        }
    }

    private async Task<TmdbMovieEnrichment> FetchEnrichmentUncachedAsync(
        int tmdbId,
        MovieMediaType mediaType,
        EnrichmentCatalog catalog,
        CancellationToken ct)
    {
        var typeSegment = MediaTypeSegment(mediaType);
        var detailUrl = $"{ApiBase}/{typeSegment}/{tmdbId}?language={catalog.Language.TmdbCode()}";
        var watchUrl = $"{ApiBase}/{typeSegment}/{tmdbId}/watch/providers";

        var detailTask = _http.GetAsync(detailUrl, HttpCompletionOption.ResponseHeadersRead, ct);
        var watchTask = _http.GetAsync(watchUrl, HttpCompletionOption.ResponseHeadersRead, ct);
        await Task.WhenAll(detailTask, watchTask).ConfigureAwait(false);

        using var detailRes = await detailTask.ConfigureAwait(false);
        using var watchRes = await watchTask.ConfigureAwait(false);
        EnsureUsableAnswer(detailRes);
        EnsureUsableAnswer(watchRes);
        var detail = detailRes.IsSuccessStatusCode
            ? await ReadEnrichmentDetailAsync(detailRes, mediaType, ct).ConfigureAwait(false)
            : EnrichmentDetail.Unknown;
        var watch = watchRes.IsSuccessStatusCode
            ? await ReadWatchProvidersAsync(watchRes, catalog.Region, ct).ConfigureAwait(false)
            : WatchProviders.None();
        return new TmdbMovieEnrichment(
            detail.VoteAverage,
            watch.Offers,
            watch.PageUrl,
            detail.RuntimeMinutes,
            detail.ReleaseDate,
            detail.Title);
    }

    private sealed record EnrichmentDetail(double? VoteAverage, int? RuntimeMinutes, string? ReleaseDate, string? Title)
    {
        public static readonly EnrichmentDetail Unknown = new(null, null, null, null);
    }

    private sealed record WatchProviders(string? PageUrl, List<TmdbWatchProviderOffer> Offers)
    {
        public static WatchProviders None() => new(null, []);
    }

    private static async Task<EnrichmentDetail> ReadEnrichmentDetailAsync(
        HttpResponseMessage response,
        MovieMediaType mediaType,
        CancellationToken ct)
    {
        await using var stream = await response.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
        var root = doc.RootElement;
        return new EnrichmentDetail(
            root.TryGetProperty("vote_average", out var va) && va.ValueKind == JsonValueKind.Number ? va.GetDouble() : null,
            ReadRuntimeMinutes(root, mediaType),
            ReadStringProp(root, mediaType == MovieMediaType.Tv ? "first_air_date" : "release_date"),
            ReadTitle(root, mediaType) is { Length: > 0 } title ? title : null);
    }

    private static async Task<WatchProviders> ReadWatchProvidersAsync(
        HttpResponseMessage response,
        string region,
        CancellationToken ct)
    {
        await using var stream = await response.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
        if (!doc.RootElement.TryGetProperty(ResultsProperty, out var results)
            || !results.TryGetProperty(region, out var regionObj)
            || regionObj.ValueKind != JsonValueKind.Object)
            return WatchProviders.None();

        var pageUrl = regionObj.TryGetProperty("link", out var linkEl) && linkEl.ValueKind == JsonValueKind.String
            ? linkEl.GetString()
            : null;
        var offers = new List<TmdbWatchProviderOffer>();
        AppendProviders(regionObj, "flatrate", "flatrate", offers);
        AppendProviders(regionObj, "rent", "rent", offers);
        AppendProviders(regionObj, "buy", "buy", offers);
        return new WatchProviders(pageUrl, DedupeProviders(offers));
    }

    private static void EnsureUsableAnswer(HttpResponseMessage response)
    {
        if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.NotFound)
            throw new HttpRequestException($"TMDB answered {(int)response.StatusCode}", null, response.StatusCode);
    }

    private static void AppendProviders(JsonElement regionObj, string jsonKey, string type, List<TmdbWatchProviderOffer> list)
    {
        if (!regionObj.TryGetProperty(jsonKey, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return;

        foreach (var p in arr.EnumerateArray())
        {
            if (!p.TryGetProperty("provider_id", out var idEl) || idEl.ValueKind != JsonValueKind.Number)
                continue;
            var providerId = idEl.GetInt32();
            var name = p.TryGetProperty("provider_name", out var n) && n.ValueKind == JsonValueKind.String
                ? n.GetString() ?? string.Empty
                : string.Empty;
            string? logo = null;
            if (p.TryGetProperty("logo_path", out var lp) && lp.ValueKind == JsonValueKind.String)
            {
                var path = lp.GetString();
                if (!string.IsNullOrEmpty(path))
                    logo = LogoBase + path;
            }

            list.Add(new TmdbWatchProviderOffer(providerId, name, logo, type));
        }
    }

    private static List<TmdbWatchProviderOffer> DedupeProviders(List<TmdbWatchProviderOffer> offers)
    {
        var best = new Dictionary<int, TmdbWatchProviderOffer>();
        foreach (var o in offers)
        {
            var r = MonetizationRank(o.MonetizationType);
            if (!best.TryGetValue(o.ProviderId, out var cur))
            {
                best[o.ProviderId] = o;
                continue;
            }

            if (r < MonetizationRank(cur.MonetizationType))
                best[o.ProviderId] = o;
        }

        return best.Values.OrderBy(o => MonetizationRank(o.MonetizationType)).ThenBy(o => o.ProviderName).ToList();
    }

    private static int MonetizationRank(string type) =>
        type switch
        {
            "flatrate" => 0,
            "rent" => 1,
            "buy" => 2,
            _ => 99
        };
}

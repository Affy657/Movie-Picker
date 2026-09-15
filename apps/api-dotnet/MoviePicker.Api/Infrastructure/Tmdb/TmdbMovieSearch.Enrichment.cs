using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed partial class TmdbMovieSearch
{
    public async Task<TmdbMovieEnrichment?> GetEnrichmentAsync(
        int tmdbId,
        MovieMediaType mediaType,
        string region,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            return null;

        var r = string.IsNullOrWhiteSpace(region) ? "FR" : region.Trim().ToUpperInvariant();
        var typeSegment = MediaTypeSegment(mediaType);
        var cacheKey = $"tmdb-enrich-v2:{typeSegment}:{r}:{tmdbId}";
        var ttl = TimeSpan.FromHours(Math.Clamp(_options.TmdbEnrichmentCacheHours, 1, 168));

        if (_cache.TryGetValue(cacheKey, out object? boxed))
        {
            if (boxed is TmdbMovieEnrichment cached)
                return cached;
            if (boxed is TmdbUnavailableMarker)
                return null;
        }

        var shared = await _sharedCache.TryGetAsync<TmdbMovieEnrichment>(cacheKey, ct).ConfigureAwait(false);
        if (shared is not null)
        {
            _cache.Set(cacheKey, shared.Value, new MemoryCacheEntryOptions { AbsoluteExpiration = shared.ExpiresAt });
            return shared.Value;
        }

        try
        {
            var fresh = await FetchEnrichmentUncachedAsync(tmdbId, mediaType, r, ct).ConfigureAwait(false);
            _cache.Set(cacheKey, fresh, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
            await _sharedCache.SetAsync(cacheKey, fresh, ttl, ct).ConfigureAwait(false);
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
                "TMDB enrichissement échoué pour {MediaType} {TmdbId} région {Region}",
                typeSegment,
                tmdbId,
                r);
            _cache.Set(
                cacheKey,
                TmdbUnavailableMarker.Instance,
                new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = FailureCacheTtl() });
            return null;
        }
    }

    private async Task<TmdbMovieEnrichment> FetchEnrichmentUncachedAsync(
        int tmdbId,
        MovieMediaType mediaType,
        string region,
        CancellationToken ct)
    {
        var key = Uri.EscapeDataString(_options.TmdbApiKey!);
        var typeSegment = MediaTypeSegment(mediaType);
        var detailUrl = $"https://api.themoviedb.org/3/{typeSegment}/{tmdbId}?api_key={key}&language=fr-FR";
        var watchUrl = $"https://api.themoviedb.org/3/{typeSegment}/{tmdbId}/watch/providers?api_key={key}";

        var detailTask = _http.GetAsync(detailUrl, HttpCompletionOption.ResponseHeadersRead, ct);
        var watchTask = _http.GetAsync(watchUrl, HttpCompletionOption.ResponseHeadersRead, ct);
        await Task.WhenAll(detailTask, watchTask).ConfigureAwait(false);

        double? voteAverage = null;
        int? runtimeMinutes = null;
        string? releaseDate = null;
        using var detailRes = await detailTask.ConfigureAwait(false);
        if (detailRes.IsSuccessStatusCode)
        {
            await using var detailStream = await detailRes.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            using var detailDoc = await JsonDocument.ParseAsync(detailStream, cancellationToken: ct).ConfigureAwait(false);
            if (detailDoc.RootElement.TryGetProperty("vote_average", out var va) && va.ValueKind == JsonValueKind.Number)
                voteAverage = va.GetDouble();
            runtimeMinutes = ReadRuntimeMinutes(detailDoc.RootElement, mediaType);
            releaseDate = mediaType == MovieMediaType.Tv
                ? ReadStringProp(detailDoc.RootElement, "first_air_date")
                : ReadStringProp(detailDoc.RootElement, "release_date");
        }

        string? watchPageUrl = null;
        var offers = new List<TmdbWatchProviderOffer>();
        using var watchRes = await watchTask.ConfigureAwait(false);
        if (watchRes.IsSuccessStatusCode)
        {
            await using var watchStream = await watchRes.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            using var watchDoc = await JsonDocument.ParseAsync(watchStream, cancellationToken: ct).ConfigureAwait(false);
            if (!watchDoc.RootElement.TryGetProperty(ResultsProperty, out var results))
                return new TmdbMovieEnrichment(voteAverage, offers, null, runtimeMinutes, releaseDate);

            if (!results.TryGetProperty(region, out var regionObj) || regionObj.ValueKind != JsonValueKind.Object)
                return new TmdbMovieEnrichment(voteAverage, offers, null, runtimeMinutes, releaseDate);

            if (regionObj.TryGetProperty("link", out var linkEl) && linkEl.ValueKind == JsonValueKind.String)
                watchPageUrl = linkEl.GetString();

            AppendProviders(regionObj, "flatrate", "flatrate", offers);
            AppendProviders(regionObj, "rent", "rent", offers);
            AppendProviders(regionObj, "buy", "buy", offers);
        }

        var deduped = DedupeProviders(offers);
        return new TmdbMovieEnrichment(voteAverage, deduped, watchPageUrl, runtimeMinutes, releaseDate);
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

using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed partial class TmdbMovieSearch
{
    private const int MinBackdropWidth = 1280;
    private const int MaxBackdrops = 40;

    public Task<IReadOnlyList<TmdbBackdrop>?> GetBackdropsAsync(int tmdbId, CancellationToken ct = default) =>
        CachedLookupAsync(
            $"tmdb-backdrops:movie:{tmdbId}",
            () => FetchBackdropsUncachedAsync(tmdbId, ct),
            ex => _logger.LogWarning(ex, "TMDB backdrops failed for movie {TmdbId}", tmdbId),
            ct);

    private async Task<T?> CachedLookupAsync<T>(
        string cacheKey,
        Func<Task<T?>> fetch,
        Action<Exception> logFailure,
        CancellationToken ct)
        where T : class
    {
        if (!_options.HasTmdbCredentials)
            throw new HttpRequestException("TMDB credentials are missing: set TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY");

        if (_cache.TryGetValue(cacheKey, out object? boxed))
        {
            if (boxed is T cached)
                return cached;
            if (boxed is TmdbNotFoundMarker)
                return null;
        }

        try
        {
            var fresh = await fetch().ConfigureAwait(false);
            var ttl = TimeSpan.FromHours(Math.Clamp(_options.TmdbEnrichmentCacheHours, 1, 168));
            _cache.Set<object>(
                cacheKey,
                fresh ?? (object)TmdbNotFoundMarker.Instance,
                new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = fresh is null ? NotFoundCacheTtl : ttl, Size = 1 });
            return fresh;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex) when (ex is TaskCanceledException or JsonException or InvalidOperationException or FormatException)
        {
            logFailure(ex);
            throw new HttpRequestException("TMDB unavailable", ex);
        }
    }

    private async Task<IReadOnlyList<TmdbBackdrop>?> FetchBackdropsUncachedAsync(int tmdbId, CancellationToken ct)
    {
        var url = $"{ApiBase}/movie/{tmdbId}/images?include_image_language=null,fr,en";
        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        if (res.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
        if (!doc.RootElement.TryGetProperty("backdrops", out var backdrops) || backdrops.ValueKind != JsonValueKind.Array)
            return [];

        return backdrops.EnumerateArray()
            .Select(ReadBackdrop)
            .OfType<RankedBackdrop>()
            .Where(b => b.Backdrop.Width >= MinBackdropWidth)
            .OrderBy(b => b.HasText)
            .ThenByDescending(b => b.Score)
            .Select(b => b.Backdrop)
            .DistinctBy(b => b.Path)
            .Take(MaxBackdrops)
            .ToList();
    }

    private static RankedBackdrop? ReadBackdrop(JsonElement item)
    {
        if (!item.TryGetProperty("file_path", out var pathElement) || pathElement.GetString() is not { Length: > 0 } path)
            return null;
        var width = item.TryGetProperty("width", out var w) && w.TryGetInt32(out var wv) ? wv : 0;
        var height = item.TryGetProperty("height", out var h) && h.TryGetInt32(out var hv) ? hv : 0;
        var votes = item.TryGetProperty("vote_count", out var vc) && vc.TryGetInt32(out var vcv) ? vcv : 0;
        var average = item.TryGetProperty("vote_average", out var va) && va.TryGetDouble(out var vav) ? vav : 0d;
        var hasText = item.TryGetProperty("iso_639_1", out var language) && language.ValueKind == JsonValueKind.String;
        return new RankedBackdrop(new TmdbBackdrop(path, width, height), hasText, average * Math.Log(1 + votes));
    }

    private sealed record RankedBackdrop(TmdbBackdrop Backdrop, bool HasText, double Score);
}

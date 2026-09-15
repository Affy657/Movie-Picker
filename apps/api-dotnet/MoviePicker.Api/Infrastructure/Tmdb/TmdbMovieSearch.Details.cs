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
    public async Task<TmdbMovieDetails?> GetDetailsAsync(
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            throw new HttpRequestException("TMDB_API_KEY manquante");

        var typeSegment = MediaTypeSegment(mediaType);
        var cacheKey = $"tmdb-details:{typeSegment}:{tmdbId}";
        var ttl = TimeSpan.FromHours(Math.Clamp(_options.TmdbEnrichmentCacheHours, 1, 168));

        if (_cache.TryGetValue(cacheKey, out object? boxed) && boxed is TmdbMovieDetails cached)
            return cached;

        try
        {
            var fresh = await FetchDetailsUncachedAsync(tmdbId, mediaType, ct).ConfigureAwait(false);
            if (fresh is not null)
                _cache.Set(cacheKey, fresh, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
            return fresh;
        }
        catch (Exception ex) when (
            ex is TaskCanceledException
                or JsonException
                or InvalidOperationException
                or FormatException)
        {
            _logger.LogWarning(ex, "TMDB détails échoué pour {MediaType} {TmdbId}", typeSegment, tmdbId);
            throw new HttpRequestException("TMDB indisponible", ex);
        }
    }

    private async Task<TmdbMovieDetails?> FetchDetailsUncachedAsync(
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct)
    {
        var key = Uri.EscapeDataString(_options.TmdbApiKey!);
        var typeSegment = MediaTypeSegment(mediaType);
        var url = $"https://api.themoviedb.org/3/{typeSegment}/{tmdbId}?api_key={key}&language=fr-FR&append_to_response=credits,videos";

        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        if (res.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
        var root = doc.RootElement;

        var title = ReadTitle(root, mediaType);
        var overview = root.TryGetProperty("overview", out var ov) ? ov.GetString() : null;
        var tagline = root.TryGetProperty("tagline", out var tl) ? tl.GetString() : null;
        var runtime = ReadRuntimeMinutes(root, mediaType);
        var releaseDate = mediaType == MovieMediaType.Tv
            ? ReadStringProp(root, "first_air_date")
            : ReadStringProp(root, "release_date");

        var (genres, genreIds) = ReadGenres(root);

        string? director = null;
        var cast = new List<string>();
        if (root.TryGetProperty("credits", out var creditsEl) && creditsEl.ValueKind == JsonValueKind.Object)
        {
            director = ReadDirector(creditsEl);
            cast = ReadTopCast(creditsEl);
        }

        var trailerUrl = ExtractTrailerUrl(root);

        return new TmdbMovieDetails(tmdbId, title, overview, tagline, director, cast, runtime, genres, genreIds, releaseDate, trailerUrl);
    }

    private static (List<string> Names, List<int> Ids) ReadGenres(JsonElement root)
    {
        var genres = new List<string>();
        var genreIds = new List<int>();
        if (!root.TryGetProperty("genres", out var genresEl) || genresEl.ValueKind != JsonValueKind.Array)
            return (genres, genreIds);

        foreach (var g in genresEl.EnumerateArray())
        {
            if (g.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.Number)
                genreIds.Add(idEl.GetInt32());

            if (g.TryGetProperty("name", out var n) && n.ValueKind == JsonValueKind.String)
            {
                var gName = n.GetString();
                if (!string.IsNullOrEmpty(gName))
                    genres.Add(gName);
            }
        }
        return (genres, genreIds);
    }

    private static string? ReadDirector(JsonElement creditsEl)
    {
        if (!creditsEl.TryGetProperty("crew", out var crewEl) || crewEl.ValueKind != JsonValueKind.Array)
            return null;

        foreach (var member in crewEl.EnumerateArray())
        {
            var job = member.TryGetProperty("job", out var jobEl) ? jobEl.GetString() : null;
            if (!string.Equals(job, "Director", StringComparison.OrdinalIgnoreCase))
                continue;
            var director = member.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
            if (!string.IsNullOrEmpty(director))
                return director;
        }
        return null;
    }

    private static List<string> ReadTopCast(JsonElement creditsEl)
    {
        var cast = new List<string>();
        if (!creditsEl.TryGetProperty("cast", out var castEl) || castEl.ValueKind != JsonValueKind.Array)
            return cast;

        var i = 0;
        foreach (var actor in castEl.EnumerateArray())
        {
            if (i++ >= 8)
                break;
            if (actor.TryGetProperty("name", out var nameEl) && nameEl.ValueKind == JsonValueKind.String)
            {
                var name = nameEl.GetString();
                if (!string.IsNullOrEmpty(name))
                    cast.Add(name);
            }
        }
        return cast;
    }
}

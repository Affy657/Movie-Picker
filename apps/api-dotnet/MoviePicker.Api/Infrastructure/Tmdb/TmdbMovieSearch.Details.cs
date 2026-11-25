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
    public Task<TmdbMovieDetails?> GetDetailsAsync(
        int tmdbId,
        MovieMediaType mediaType,
        CatalogLanguage language,
        CancellationToken ct = default)
    {
        var typeSegment = MediaTypeSegment(mediaType);
        return CachedLookupAsync(
            $"tmdb-details:{typeSegment}:{language.TmdbCode()}:{tmdbId}",
            () => FetchDetailsUncachedAsync(tmdbId, mediaType, language, ct),
            ex => _logger.LogWarning(ex, "TMDB details failed for {MediaType} {TmdbId}", typeSegment, tmdbId),
            ct);
    }

    private async Task<TmdbMovieDetails?> FetchDetailsUncachedAsync(
        int tmdbId,
        MovieMediaType mediaType,
        CatalogLanguage language,
        CancellationToken ct)
    {
        var typeSegment = MediaTypeSegment(mediaType);
        var url = $"{ApiBase}/{typeSegment}/{tmdbId}?language={language.TmdbCode()}&append_to_response={AppendedResponses(mediaType)}"
            + "&include_video_language=fr,en,null";

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
        if (mediaType == MovieMediaType.Tv)
            director ??= ReadCreators(root);

        var trailerUrl = ExtractTrailerUrl(root, language);

        return new TmdbMovieDetails(
            tmdbId,
            title,
            overview,
            tagline,
            director,
            cast,
            runtime,
            genres,
            genreIds,
            releaseDate,
            trailerUrl,
            ReadVoteAverage(root),
            ReadPosterUrl(root),
            ReadBackdropUrl(root),
            mediaType == MovieMediaType.Tv ? ReadPositiveInt(root, "number_of_seasons") : null,
            mediaType == MovieMediaType.Tv ? ReadPositiveInt(root, "number_of_episodes") : null,
            ReadDetailsExtras(root, mediaType, language));
    }

    private static string? ReadBackdropUrl(JsonElement root)
    {
        if (!root.TryGetProperty("backdrop_path", out var bp) || bp.ValueKind != JsonValueKind.String)
            return null;
        var path = bp.GetString();
        return string.IsNullOrEmpty(path) ? null : BackdropBase + path;
    }

    private static int? ReadPositiveInt(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var el) || el.ValueKind != JsonValueKind.Number)
            return null;
        var value = el.GetInt32();
        return value > 0 ? value : null;
    }

    private static string? ReadCreators(JsonElement root)
    {
        if (!root.TryGetProperty("created_by", out var creators) || creators.ValueKind != JsonValueKind.Array)
            return null;
        var names = new List<string>();
        foreach (var creator in creators.EnumerateArray())
        {
            var name = creator.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
            if (!string.IsNullOrEmpty(name))
                names.Add(name);
        }
        return names.Count == 0 ? null : string.Join(", ", names);
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

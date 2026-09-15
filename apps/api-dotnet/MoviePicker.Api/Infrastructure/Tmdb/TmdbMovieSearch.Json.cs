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
    private static string MediaTypeSegment(MovieMediaType m) => m == MovieMediaType.Tv ? "tv" : "movie";

    private static MovieMediaType? ResolveMediaType(JsonElement item, bool allowSeries)
    {
        if (!allowSeries)
            return MovieMediaType.Movie;

        if (!item.TryGetProperty("media_type", out var mt) || mt.ValueKind != JsonValueKind.String)
            return null;

        return mt.GetString() switch
        {
            "movie" => MovieMediaType.Movie,
            "tv" => MovieMediaType.Tv,
            _ => null
        };
    }

    private static string? ReadOriginalTitle(JsonElement el, MovieMediaType mediaType)
    {
        var property = mediaType == MovieMediaType.Tv ? "original_name" : "original_title";
        if (el.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String)
            return value.GetString();
        return null;
    }

    private static string ReadTitle(JsonElement el, MovieMediaType mediaType)
    {
        if (mediaType == MovieMediaType.Tv)
        {
            if (el.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String)
                return name.GetString() ?? string.Empty;
            return el.TryGetProperty("title", out var t) ? t.GetString() ?? string.Empty : string.Empty;
        }

        if (el.TryGetProperty("title", out var titleEl) && titleEl.ValueKind == JsonValueKind.String)
            return titleEl.GetString() ?? string.Empty;
        return el.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? string.Empty : string.Empty;
    }

    private static string? ReadStringProp(JsonElement el, string name) =>
        el.TryGetProperty(name, out var v) ? v.GetString() : null;

    private static string ReadYear(JsonElement el, MovieMediaType mediaType)
    {
        string? date = mediaType == MovieMediaType.Tv
            ? ReadStringProp(el, "first_air_date")
            : ReadStringProp(el, "release_date");
        return date is { Length: >= 4 } ? date[..4] : string.Empty;
    }

    private static string? ReadPosterUrl(JsonElement el)
    {
        if (!el.TryGetProperty("poster_path", out var pp) || pp.ValueKind != JsonValueKind.String)
            return null;
        var p = pp.GetString();
        return string.IsNullOrEmpty(p) ? null : PosterBase + p;
    }

    private static int? ReadRuntimeMinutes(JsonElement root, MovieMediaType mediaType) =>
        mediaType == MovieMediaType.Movie ? ReadMovieRuntime(root) : ReadSeriesRuntime(root);

    private static int? ReadMovieRuntime(JsonElement root)
    {
        if (root.TryGetProperty("runtime", out var rt) && rt.ValueKind == JsonValueKind.Number)
        {
            var minutes = rt.GetInt32();
            return minutes > 0 ? minutes : null;
        }
        return null;
    }

    private static int? ReadSeriesRuntime(JsonElement root)
    {
        if (!root.TryGetProperty("episode_run_time", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return null;
        foreach (var el in arr.EnumerateArray())
        {
            if (el.ValueKind != JsonValueKind.Number)
                continue;
            var minutes = el.GetInt32();
            if (minutes > 0)
                return minutes;
        }
        return null;
    }

    private static string? ExtractTrailerUrl(JsonElement root)
    {
        if (!root.TryGetProperty("videos", out var videos) || videos.ValueKind != JsonValueKind.Object)
            return null;
        if (!videos.TryGetProperty(ResultsProperty, out var results) || results.ValueKind != JsonValueKind.Array)
            return null;

        string? bestKey = null;
        var bestRank = int.MaxValue;
        foreach (var v in results.EnumerateArray())
        {
            if (ReadYouTubeTrailerCandidate(v) is { } candidate && candidate.Rank < bestRank)
            {
                bestRank = candidate.Rank;
                bestKey = candidate.Key;
            }
        }

        return bestKey is null ? null : YoutubeWatchBase + Uri.EscapeDataString(bestKey);
    }

    private static (string Key, int Rank)? ReadYouTubeTrailerCandidate(JsonElement v)
    {
        var site = v.TryGetProperty("site", out var s) ? s.GetString() : null;
        if (!string.Equals(site, "YouTube", StringComparison.OrdinalIgnoreCase))
            return null;

        var key = v.TryGetProperty("key", out var k) ? k.GetString() : null;
        if (string.IsNullOrWhiteSpace(key))
            return null;

        var type = v.TryGetProperty("type", out var tp) ? tp.GetString() : null;
        var lang = v.TryGetProperty("iso_639_1", out var lg) ? lg.GetString() : null;
        var official = v.TryGetProperty("official", out var of) && of.ValueKind == JsonValueKind.True;

        return (key, TrailerRank(type, lang, official));
    }

    private static int TrailerRank(string? type, string? lang, bool official)
    {
        var typeRank = type switch
        {
            "Trailer" => 0,
            "Teaser" => 10,
            "Clip" => 20,
            "Featurette" => 30,
            _ => 40
        };
        var langRank = lang switch
        {
            "fr" => 0,
            "en" => 1,
            _ => 2
        };
        return typeRank + langRank + (official ? 0 : 5);
    }
}

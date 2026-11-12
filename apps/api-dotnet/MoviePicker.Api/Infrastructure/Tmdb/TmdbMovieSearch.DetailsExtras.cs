using System.Text.Json;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed partial class TmdbMovieSearch
{
    private const string ProfileBase = "https://image.tmdb.org/t/p/w185";
    private const string CertificationRegion = "FR";
    private const int TheatricalReleaseType = 3;
    private const int MaxCastMembers = 20;
    private const int MaxWritersPerFilm = 4;
    private const int MaxNamesPerCrewJob = 3;
    private const int MaxVideos = 6;

    private static readonly Dictionary<string, string> CrewJobKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Director"] = TmdbCrewJobs.Director,
        ["Screenplay"] = TmdbCrewJobs.Writer,
        ["Writer"] = TmdbCrewJobs.Writer,
        ["Story"] = TmdbCrewJobs.Writer,
        ["Novel"] = TmdbCrewJobs.Writer,
        ["Author"] = TmdbCrewJobs.Writer,
        ["Original Music Composer"] = TmdbCrewJobs.Composer,
        ["Music"] = TmdbCrewJobs.Composer,
        ["Director of Photography"] = TmdbCrewJobs.Photography,
    };

    private static readonly string[] CrewJobOrder =
    [
        TmdbCrewJobs.Creator,
        TmdbCrewJobs.Director,
        TmdbCrewJobs.Writer,
        TmdbCrewJobs.Composer,
        TmdbCrewJobs.Photography,
    ];

    private static readonly string[] KeptVideoTypes = ["Trailer", "Teaser", "Clip", "Featurette"];

    private static string AppendedResponses(MovieMediaType mediaType) =>
        mediaType == MovieMediaType.Tv ? "credits,videos,content_ratings" : "credits,videos,release_dates";

    private static TmdbMovieDetailsExtras ReadDetailsExtras(JsonElement root, MovieMediaType mediaType)
    {
        var isFilm = mediaType == MovieMediaType.Movie;
        JsonElement? credits = root.TryGetProperty("credits", out var creditsEl) && creditsEl.ValueKind == JsonValueKind.Object
            ? creditsEl
            : null;

        return new TmdbMovieDetailsExtras(
            ReadText(root, mediaType == MovieMediaType.Tv ? "original_name" : "original_title"),
            ReadText(root, "original_language"),
            isFilm ? ReadProductionCountries(root) : ReadTextArray(root, "origin_country"),
            isFilm ? ReadBudget(root) : null,
            ReadVoteCount(root),
            isFilm ? ReadFilmCertification(root) : ReadSeriesCertification(root),
            isFilm ? ReadCollectionReference(root) : null,
            isFilm && credits is { } filmCredits ? ReadDirectorId(filmCredits) : null,
            credits is { } castCredits ? ReadCastMembers(castCredits) : [],
            ReadCrew(root, credits, mediaType),
            ReadVideos(root));
    }

    private static string? ReadText(JsonElement el, string name) =>
        el.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            && value.GetString() is { } text && !string.IsNullOrWhiteSpace(text)
            ? text
            : null;

    private static JsonElement? ReadArray(JsonElement el, string name) =>
        el.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Array ? value : null;

    private static List<string> ReadTextArray(JsonElement root, string name)
    {
        if (ReadArray(root, name) is not { } values)
            return [];
        return values.EnumerateArray()
            .Where(value => value.ValueKind == JsonValueKind.String)
            .Select(value => value.GetString())
            .OfType<string>()
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }

    private static List<string> ReadProductionCountries(JsonElement root)
    {
        if (ReadArray(root, "production_countries") is not { } countries)
            return [];
        return countries.EnumerateArray()
            .Where(country => country.ValueKind == JsonValueKind.Object)
            .Select(country => ReadText(country, "iso_3166_1"))
            .OfType<string>()
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }

    private static long? ReadBudget(JsonElement root) =>
        root.TryGetProperty("budget", out var budget) && budget.ValueKind == JsonValueKind.Number
            && budget.TryGetInt64(out var value) && value > 0
            ? value
            : null;

    private static int? ReadVoteCount(JsonElement root) =>
        root.TryGetProperty("vote_count", out var count) && count.ValueKind == JsonValueKind.Number
            && count.TryGetInt32(out var value) && value >= 0
            ? value
            : null;

    private static int? ReadId(JsonElement el) =>
        el.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.Number
            && id.TryGetInt32(out var value) && value > 0
            ? value
            : null;

    private static JsonElement? ReadFrenchEntry(JsonElement root, string property)
    {
        if (!root.TryGetProperty(property, out var container) || container.ValueKind != JsonValueKind.Object
            || ReadArray(container, ResultsProperty) is not { } results)
            return null;

        foreach (var entry in results.EnumerateArray())
        {
            if (entry.ValueKind == JsonValueKind.Object
                && string.Equals(ReadText(entry, "iso_3166_1"), CertificationRegion, StringComparison.OrdinalIgnoreCase))
                return entry;
        }
        return null;
    }

    private static string? ReadFilmCertification(JsonElement root)
    {
        if (ReadFrenchEntry(root, "release_dates") is not { } france
            || ReadArray(france, "release_dates") is not { } releases)
            return null;

        string? firstRated = null;
        foreach (var release in releases.EnumerateArray())
        {
            if (release.ValueKind != JsonValueKind.Object || ReadText(release, "certification") is not { } certification)
                continue;
            if (release.TryGetProperty("type", out var type) && type.ValueKind == JsonValueKind.Number
                && type.TryGetInt32(out var releaseType) && releaseType == TheatricalReleaseType)
                return certification;
            firstRated ??= certification;
        }
        return firstRated;
    }

    private static string? ReadSeriesCertification(JsonElement root) =>
        ReadFrenchEntry(root, "content_ratings") is { } france ? ReadText(france, "rating") : null;

    private static TmdbCollectionReference? ReadCollectionReference(JsonElement root)
    {
        if (!root.TryGetProperty("belongs_to_collection", out var collection) || collection.ValueKind != JsonValueKind.Object)
            return null;
        return ReadId(collection) is int id && ReadText(collection, "name") is { } name
            ? new TmdbCollectionReference(id, name)
            : null;
    }

    private static int? ReadDirectorId(JsonElement credits)
    {
        if (ReadArray(credits, "crew") is not { } crew)
            return null;
        return crew.EnumerateArray()
            .Where(member => member.ValueKind == JsonValueKind.Object && IsDirectingCredit(member))
            .Select(ReadId)
            .FirstOrDefault(id => id is not null);
    }

    private static List<TmdbCastMember> ReadCastMembers(JsonElement credits)
    {
        if (ReadArray(credits, "cast") is not { } cast)
            return [];
        return cast.EnumerateArray()
            .Where(actor => actor.ValueKind == JsonValueKind.Object)
            .Select(actor => (Name: ReadText(actor, "name"), Actor: actor))
            .Where(entry => entry.Name is not null)
            .Take(MaxCastMembers)
            .Select(entry => new TmdbCastMember(
                entry.Name!,
                ReadText(entry.Actor, "character"),
                ReadText(entry.Actor, "profile_path") is { } profile ? ProfileBase + profile : null))
            .ToList();
    }

    private static List<TmdbCrewCredit> ReadCrew(JsonElement root, JsonElement? credits, MovieMediaType mediaType)
    {
        var namesByJob = CrewJobOrder.ToDictionary(job => job, _ => new List<string>(), StringComparer.Ordinal);

        if (mediaType == MovieMediaType.Tv && ReadArray(root, "created_by") is { } creators)
        {
            foreach (var creator in creators.EnumerateArray())
                AddCrewName(namesByJob, TmdbCrewJobs.Creator, creator);
        }

        if (credits is { } creditsEl && ReadArray(creditsEl, "crew") is { } crew)
        {
            foreach (var member in crew.EnumerateArray())
            {
                if (member.ValueKind == JsonValueKind.Object
                    && ReadText(member, "job") is { } job
                    && CrewJobKeys.TryGetValue(job, out var key))
                    AddCrewName(namesByJob, key, member);
            }
        }

        return CrewJobOrder
            .SelectMany(job => namesByJob[job].Select(name => new TmdbCrewCredit(job, name)))
            .ToList();
    }

    private static void AddCrewName(Dictionary<string, List<string>> namesByJob, string job, JsonElement person)
    {
        if (person.ValueKind != JsonValueKind.Object || ReadText(person, "name") is not { } name)
            return;
        var names = namesByJob[job];
        var cap = job == TmdbCrewJobs.Writer ? MaxWritersPerFilm : MaxNamesPerCrewJob;
        if (names.Count < cap && !names.Contains(name, StringComparer.Ordinal))
            names.Add(name);
    }

    private static List<TmdbVideo> ReadVideos(JsonElement root)
    {
        if (!root.TryGetProperty("videos", out var videos) || videos.ValueKind != JsonValueKind.Object
            || ReadArray(videos, ResultsProperty) is not { } results)
            return [];

        return results.EnumerateArray()
            .Select(ReadYouTubeVideo)
            .OfType<TmdbVideo>()
            .OrderBy(video => VideoTypeRank(video.Type))
            .ThenBy(video => VideoLanguageRank(video.Language))
            .Take(MaxVideos)
            .ToList();
    }

    private static TmdbVideo? ReadYouTubeVideo(JsonElement video)
    {
        if (video.ValueKind != JsonValueKind.Object
            || !string.Equals(ReadText(video, "site"), "YouTube", StringComparison.OrdinalIgnoreCase)
            || ReadText(video, "key") is not { } key)
            return null;

        var tmdbType = ReadText(video, "type");
        var type = Array.Find(KeptVideoTypes, kept => string.Equals(kept, tmdbType, StringComparison.OrdinalIgnoreCase));
        return type is null
            ? null
            : new TmdbVideo(key, ReadText(video, "name") ?? type, type, ReadText(video, "iso_639_1"));
    }

    private static int VideoTypeRank(string type) => type switch
    {
        "Trailer" => 0,
        "Teaser" => 1,
        _ => 2,
    };

    private static int VideoLanguageRank(string? language) => language switch
    {
        "fr" => 0,
        "en" => 1,
        _ => 2,
    };
}

using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed class TmdbMovieSearch : ITmdbMovieSearch
{
    private const string PosterBase = "https://image.tmdb.org/t/p/w154";
    private const string LogoBase = "https://image.tmdb.org/t/p/w45";
    private const string YoutubeWatchBase = "https://www.youtube.com/watch?v=";
    private const string ResultsProperty = "results";

    private readonly HttpClient _http;
    private readonly MoviePickerOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<TmdbMovieSearch> _logger;

    public TmdbMovieSearch(
        HttpClient http,
        IOptions<MoviePickerOptions> options,
        IMemoryCache cache,
        ILogger<TmdbMovieSearch> logger)
    {
        _http = http;
        _options = options.Value;
        _cache = cache;
        _logger = logger;
    }

    public async Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(
        string query,
        bool allowSeries,
        IReadOnlyList<int>? genreIds = null,
        int? yearFrom = null,
        int? yearTo = null,
        double? voteMin = null,
        string? originalLanguage = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            throw new InvalidOperationException("TMDB_API_KEY manquante");

        var trimmedQuery = query.Trim();
        var hasText = trimmedQuery.Length > 0;
        var hasFilters = (genreIds?.Count > 0) || yearFrom.HasValue || yearTo.HasValue
            || voteMin.HasValue || !string.IsNullOrWhiteSpace(originalLanguage);

        if (!hasText && !hasFilters)
            return Array.Empty<TmdbSearchItem>();

        var key = Uri.EscapeDataString(_options.TmdbApiKey);

        if (!hasText)
            return await DiscoverMoviesAsync(key, genreIds, yearFrom, yearTo, voteMin, originalLanguage, ct);

        var q = Uri.EscapeDataString(trimmedQuery);
        var endpoint = allowSeries ? "search/multi" : "search/movie";
        var url = $"https://api.themoviedb.org/3/{endpoint}?api_key={key}&query={q}&language=fr-FR";

        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty(ResultsProperty, out var results))
            return Array.Empty<TmdbSearchItem>();

        var list = new List<TmdbSearchItem>();
        var n = 0;
        foreach (var item in results.EnumerateArray())
        {
            if (n >= 20)
                break;

            var mapped = TryMapSearchItem(item, allowSeries, genreIds, yearFrom, yearTo, voteMin, originalLanguage);
            if (mapped is null)
                continue;

            list.Add(mapped);
            n++;
        }

        return list;
    }

    private static TmdbSearchItem? TryMapSearchItem(
        JsonElement item,
        bool allowSeries,
        IReadOnlyList<int>? genreIds,
        int? yearFrom,
        int? yearTo,
        double? voteMin,
        string? originalLanguage)
    {
        var mediaType = ResolveMediaType(item, allowSeries);
        if (mediaType is null)
            return null;

        if (!MatchesGenres(item, genreIds))
            return null;

        if (!MatchesYearRange(item, mediaType.Value, yearFrom, yearTo))
            return null;

        var voteAverage = ReadVoteAverage(item);
        if (!MatchesVoteMin(voteAverage, voteMin))
            return null;

        if (!MatchesLanguage(item, originalLanguage))
            return null;

        var title = ReadTitle(item, mediaType.Value);
        if (string.IsNullOrEmpty(title))
            return null;

        var id = item.GetProperty("id").GetInt32();
        var year = ReadYear(item, mediaType.Value);
        var posterPath = ReadPosterUrl(item);
        return new TmdbSearchItem(id, mediaType.Value, title, year, posterPath, voteAverage);
    }

    private static bool MatchesGenres(JsonElement item, IReadOnlyList<int>? genreIds)
    {
        if (!(genreIds?.Count > 0))
            return true;
        var itemGenreIds = ReadGenreIdArray(item);
        return genreIds.Any(itemGenreIds.Contains);
    }

    private static bool MatchesYearRange(JsonElement item, MovieMediaType mediaType, int? yearFrom, int? yearTo)
    {
        if (!yearFrom.HasValue && !yearTo.HasValue)
            return true;
        if (!int.TryParse(ReadYear(item, mediaType), out var yr))
            return false;
        return (!yearFrom.HasValue || yr >= yearFrom.Value)
            && (!yearTo.HasValue || yr <= yearTo.Value);
    }

    private static bool MatchesVoteMin(double? voteAverage, double? voteMin) =>
        !voteMin.HasValue || (voteAverage is not null && voteAverage >= voteMin.Value);

    private static bool MatchesLanguage(JsonElement item, string? originalLanguage)
    {
        if (string.IsNullOrWhiteSpace(originalLanguage))
            return true;
        var lang = ReadOriginalLanguage(item);
        return string.Equals(lang, originalLanguage, StringComparison.OrdinalIgnoreCase);
    }

    private static double? ReadVoteAverage(JsonElement item) =>
        item.TryGetProperty("vote_average", out var vaEl) && vaEl.ValueKind == JsonValueKind.Number
            ? vaEl.GetDouble()
            : null;

    private async Task<IReadOnlyList<TmdbSearchItem>> DiscoverMoviesAsync(
        string apiKey,
        IReadOnlyList<int>? genreIds,
        int? yearFrom,
        int? yearTo,
        double? voteMin,
        string? originalLanguage,
        CancellationToken ct)
    {
        var url = $"https://api.themoviedb.org/3/discover/movie?api_key={apiKey}&language=fr-FR&sort_by=popularity.desc";
        if (genreIds?.Count > 0)
            url += $"&with_genres={string.Join(",", genreIds)}";
        if (yearFrom.HasValue)
            url += $"&primary_release_date.gte={yearFrom.Value}-01-01";
        if (yearTo.HasValue)
            url += $"&primary_release_date.lte={yearTo.Value}-12-31";
        if (voteMin.HasValue)
            url += $"&vote_average.gte={voteMin.Value.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)}";
        if (!string.IsNullOrWhiteSpace(originalLanguage))
            url += $"&with_original_language={Uri.EscapeDataString(originalLanguage.Trim())}";

        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

        if (!doc.RootElement.TryGetProperty(ResultsProperty, out var results))
            return Array.Empty<TmdbSearchItem>();

        var list = new List<TmdbSearchItem>();
        var n = 0;
        foreach (var item in results.EnumerateArray())
        {
            if (n >= 20) break;

            var id = item.GetProperty("id").GetInt32();
            var title = ReadTitle(item, MovieMediaType.Movie);
            if (string.IsNullOrEmpty(title)) continue;

            var year = ReadYear(item, MovieMediaType.Movie);
            var posterPath = ReadPosterUrl(item);
            var voteAverage = ReadVoteAverage(item);

            list.Add(new TmdbSearchItem(id, MovieMediaType.Movie, title, year, posterPath, voteAverage));
            n++;
        }

        return list;
    }

    private static IReadOnlyList<int> ReadGenreIdArray(JsonElement item)
    {
        if (!item.TryGetProperty("genre_ids", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return Array.Empty<int>();

        var ids = new List<int>();
        foreach (var el in arr.EnumerateArray())
        {
            if (el.ValueKind == JsonValueKind.Number)
                ids.Add(el.GetInt32());
        }
        return ids;
    }

    private static string? ReadOriginalLanguage(JsonElement item) =>
        item.TryGetProperty("original_language", out var lang) && lang.ValueKind == JsonValueKind.String
            ? lang.GetString()
            : null;

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

        if (_cache.TryGetValue(cacheKey, out object? boxed) && boxed is TmdbMovieEnrichment cached)
            return cached;

        try
        {
            var fresh = await FetchEnrichmentUncachedAsync(tmdbId, mediaType, r, ct).ConfigureAwait(false);
            _cache.Set(cacheKey, fresh, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
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
        using var detailRes = await detailTask.ConfigureAwait(false);
        if (detailRes.IsSuccessStatusCode)
        {
            await using var detailStream = await detailRes.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            using var detailDoc = await JsonDocument.ParseAsync(detailStream, cancellationToken: ct).ConfigureAwait(false);
            if (detailDoc.RootElement.TryGetProperty("vote_average", out var va) && va.ValueKind == JsonValueKind.Number)
                voteAverage = va.GetDouble();
            runtimeMinutes = ReadRuntimeMinutes(detailDoc.RootElement, mediaType);
        }

        string? watchPageUrl = null;
        var offers = new List<TmdbWatchProviderOffer>();
        using var watchRes = await watchTask.ConfigureAwait(false);
        if (watchRes.IsSuccessStatusCode)
        {
            await using var watchStream = await watchRes.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
            using var watchDoc = await JsonDocument.ParseAsync(watchStream, cancellationToken: ct).ConfigureAwait(false);
            if (!watchDoc.RootElement.TryGetProperty(ResultsProperty, out var results))
                return new TmdbMovieEnrichment(voteAverage, offers, null, runtimeMinutes);

            if (!results.TryGetProperty(region, out var regionObj) || regionObj.ValueKind != JsonValueKind.Object)
                return new TmdbMovieEnrichment(voteAverage, offers, null, runtimeMinutes);

            if (regionObj.TryGetProperty("link", out var linkEl) && linkEl.ValueKind == JsonValueKind.String)
                watchPageUrl = linkEl.GetString();

            AppendProviders(regionObj, "flatrate", "flatrate", offers);
            AppendProviders(regionObj, "rent", "rent", offers);
            AppendProviders(regionObj, "buy", "buy", offers);
        }

        var deduped = DedupeProviders(offers);
        return new TmdbMovieEnrichment(voteAverage, deduped, watchPageUrl, runtimeMinutes);
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

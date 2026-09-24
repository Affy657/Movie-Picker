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
    private static string BuildDiscoverUrl(TmdbDiscoveryCriteria criteria, int page)
    {
        var sortBy = string.IsNullOrWhiteSpace(criteria.SortBy) ? "popularity.desc" : criteria.SortBy.Trim();
        var url = $"{ApiBase}/discover/movie?language=fr-FR"
            + $"&sort_by={Uri.EscapeDataString(sortBy)}&page={page}";
        if (criteria.GenreIds?.Count > 0)
            url += $"&with_genres={string.Join(",", criteria.GenreIds)}";
        if (criteria.YearFrom.HasValue)
            url += $"&primary_release_date.gte={criteria.YearFrom.Value}-01-01";
        if (criteria.YearTo.HasValue)
            url += $"&primary_release_date.lte={criteria.YearTo.Value}-12-31";
        if (criteria.VoteMin.HasValue)
            url += $"&vote_average.gte={criteria.VoteMin.Value.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)}";
        if (!string.IsNullOrWhiteSpace(criteria.OriginalLanguage))
            url += $"&with_original_language={Uri.EscapeDataString(criteria.OriginalLanguage.Trim())}";
        if (criteria.RuntimeMin.HasValue)
            url += $"&with_runtime.gte={criteria.RuntimeMin.Value}";
        if (criteria.RuntimeMax.HasValue)
            url += $"&with_runtime.lte={criteria.RuntimeMax.Value}";
        if (criteria.CompanyIds?.Count > 0)
            url += $"&with_companies={string.Join("|", criteria.CompanyIds)}";
        if (criteria.VoteCountMin.HasValue)
            url += $"&vote_count.gte={criteria.VoteCountMin.Value}";
        if (criteria.WatchProviderIds?.Count > 0 && !string.IsNullOrWhiteSpace(criteria.WatchRegion))
        {
            url += $"&with_watch_providers={string.Join("|", criteria.WatchProviderIds)}";
            url += $"&watch_region={Uri.EscapeDataString(criteria.WatchRegion.Trim())}";
        }
        return url;
    }

    public Task<IReadOnlyList<TmdbSearchItem>> DiscoverMoviesAsync(
        TmdbDiscoveryCriteria criteria,
        int pages,
        CancellationToken ct = default)
    {
        RequireCredentials();
        return FetchPagesAsync(page => BuildDiscoverUrl(criteria, page), pages, MovieMediaType.Movie, ct);
    }

    public Task<IReadOnlyList<TmdbSearchItem>> GetTrendingMoviesAsync(int pages, CancellationToken ct = default)
    {
        RequireCredentials();
        return FetchPagesAsync(
            page => $"{ApiBase}/trending/movie/week?language=fr-FR&page={page}",
            pages,
            MovieMediaType.Movie,
            ct);
    }

    public Task<IReadOnlyList<TmdbSearchItem>> GetNowPlayingMoviesAsync(
        string region,
        int pages,
        CancellationToken ct = default)
    {
        RequireCredentials();
        var r = string.IsNullOrWhiteSpace(region) ? "FR" : region.Trim().ToUpperInvariant();
        return FetchPagesAsync(
            page => $"{ApiBase}/movie/now_playing?language=fr-FR&region={r}&page={page}",
            pages,
            MovieMediaType.Movie,
            ct);
    }

    public async Task<IReadOnlyList<TmdbSearchItem>> GetRecommendationsAsync(
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default)
    {
        RequireCredentials();
        var typeSegment = MediaTypeSegment(mediaType);
        try
        {
            return await FetchPagesAsync(
                page => $"{ApiBase}/{typeSegment}/{tmdbId}/recommendations?language=fr-FR&page={page}",
                2,
                mediaType,
                ct).ConfigureAwait(false);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return [];
        }
    }

    public async Task<TmdbCollectionSummary?> GetCollectionAsync(int collectionId, CancellationToken ct = default)
    {
        var root = await FetchCollectionRootAsync(collectionId, ct).ConfigureAwait(false);
        if (root is null)
            return null;

        using var doc = root;
        var element = doc.RootElement;
        var name = element.TryGetProperty("name", out var nameEl) && nameEl.ValueKind == JsonValueKind.String
            ? nameEl.GetString() ?? string.Empty
            : string.Empty;
        if (string.IsNullOrEmpty(name))
            return null;

        var overview = element.TryGetProperty("overview", out var overviewEl) && overviewEl.ValueKind == JsonValueKind.String
            ? overviewEl.GetString()
            : null;
        var movieCount = element.TryGetProperty("parts", out var parts) && parts.ValueKind == JsonValueKind.Array
            ? parts.GetArrayLength()
            : 0;

        return new TmdbCollectionSummary(collectionId, name, overview, ReadPosterUrl(element), movieCount);
    }

    public async Task<IReadOnlyList<TmdbSearchItem>> GetCollectionMoviesAsync(
        int collectionId,
        CancellationToken ct = default)
    {
        var root = await FetchCollectionRootAsync(collectionId, ct).ConfigureAwait(false);
        if (root is null)
            return [];

        using var doc = root;
        if (!doc.RootElement.TryGetProperty("parts", out var parts) || parts.ValueKind != JsonValueKind.Array)
            return [];

        var list = new List<TmdbSearchItem>();
        foreach (var item in parts.EnumerateArray())
        {
            var mapped = MapListItem(item, MovieMediaType.Movie);
            if (mapped is not null)
                list.Add(mapped);
        }
        return list;
    }

    private async Task<JsonDocument?> FetchCollectionRootAsync(int collectionId, CancellationToken ct)
    {
        RequireCredentials();
        var url = $"{ApiBase}/collection/{collectionId}?language=fr-FR";

        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        if (res.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
        return await JsonDocument.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
    }


    private async Task<IReadOnlyList<TmdbSearchItem>> FetchPagesAsync(
        Func<int, string> urlForPage,
        int pages,
        MovieMediaType mediaType,
        CancellationToken ct)
    {
        var pageCount = Math.Clamp(pages, 1, 10);
        var seen = new HashSet<int>();
        var list = new List<TmdbSearchItem>();

        for (var page = 1; page <= pageCount; page++)
        {
            var items = await FetchPageAsync(urlForPage(page), mediaType, ct).ConfigureAwait(false);
            if (items.Count == 0)
                break;
            foreach (var item in items)
            {
                if (seen.Add(item.Id))
                    list.Add(item);
            }
        }

        return list;
    }

    private async Task<List<TmdbSearchItem>> FetchPageAsync(string url, MovieMediaType mediaType, CancellationToken ct)
    {
        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct).ConfigureAwait(false);
        if (!doc.RootElement.TryGetProperty(ResultsProperty, out var results) || results.ValueKind != JsonValueKind.Array)
            return [];

        var list = new List<TmdbSearchItem>();
        foreach (var item in results.EnumerateArray())
        {
            var mapped = MapListItem(item, mediaType);
            if (mapped is not null)
                list.Add(mapped);
        }
        return list;
    }

    private static TmdbSearchItem? MapListItem(JsonElement item, MovieMediaType mediaType)
    {
        var id = item.GetProperty("id").GetInt32();
        var title = ReadTitle(item, mediaType);
        if (string.IsNullOrEmpty(title))
            return null;

        var year = ReadYear(item, mediaType);
        var posterPath = ReadPosterUrl(item);
        var voteAverage = ReadVoteAverage(item);
        var genreIds = ReadGenreIdArray(item);
        return new TmdbSearchItem(id, mediaType, title, year, posterPath, voteAverage, GenreIds: genreIds);
    }

    private static List<int> ReadGenreIdArray(JsonElement item)
    {
        if (!item.TryGetProperty("genre_ids", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return [];

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
}

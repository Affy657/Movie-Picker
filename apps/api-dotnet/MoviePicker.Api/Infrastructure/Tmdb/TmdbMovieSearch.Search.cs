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
    public async Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(
        string query,
        bool allowSeries,
        IReadOnlyList<int>? genreIds = null,
        int? yearFrom = null,
        int? yearTo = null,
        double? voteMin = null,
        string? originalLanguage = null,
        int? runtimeMin = null,
        int? runtimeMax = null,
        CancellationToken ct = default)
    {
        RequireCredentials();

        var trimmedQuery = query.Trim();
        var hasText = trimmedQuery.Length > 0;
        var hasFilters = (genreIds?.Count > 0) || yearFrom.HasValue || yearTo.HasValue
            || voteMin.HasValue || !string.IsNullOrWhiteSpace(originalLanguage)
            || runtimeMin.HasValue || runtimeMax.HasValue;

        if (!hasText && !hasFilters)
            return [];

        if (!hasText)
            return await DiscoverMoviesAsync(
                new TmdbDiscoveryCriteria(genreIds, yearFrom, yearTo, voteMin, originalLanguage, runtimeMin, runtimeMax),
                1,
                ct);

        var q = Uri.EscapeDataString(trimmedQuery);
        var endpoint = allowSeries ? "search/multi" : "search/movie";
        var url = $"{ApiBase}/{endpoint}?query={q}&language=fr-FR";

        var titleMatchesTask = FetchAndMapResultsAsync(
            url,
            item => TryMapSearchItem(item, allowSeries, genreIds, yearFrom, yearTo, voteMin, originalLanguage),
            ct);
        var creditMatchesTask = SearchByPersonCreditsAsync(
            trimmedQuery, allowSeries, genreIds, yearFrom, yearTo, voteMin, originalLanguage, ct);

        await Task.WhenAll(titleMatchesTask, creditMatchesTask);

        return MergeTitleAndCreditMatches(await titleMatchesTask, await creditMatchesTask);
    }

    private async Task<List<TmdbSearchItem>> FetchAndMapResultsAsync(
        string url,
        Func<JsonElement, TmdbSearchItem?> mapItem,
        CancellationToken ct)
    {
        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty(ResultsProperty, out var results))
            return [];

        var list = new List<TmdbSearchItem>();
        foreach (var item in results.EnumerateArray())
        {
            if (list.Count >= MaxResults)
                break;

            var mapped = mapItem(item);
            if (mapped is not null)
                list.Add(mapped);
        }

        return list;
    }

    private async Task<PersonCreditMatches> SearchByPersonCreditsAsync(
        string query,
        bool allowSeries,
        IReadOnlyList<int>? genreIds,
        int? yearFrom,
        int? yearTo,
        double? voteMin,
        string? originalLanguage,
        CancellationToken ct)
    {
        var normalizedQuery = NormalizeSearchText(query);
        if (normalizedQuery.Length < MinPersonQueryLength)
            return PersonCreditMatches.None;

        try
        {
            var person = await FindBestMatchingPersonAsync(normalizedQuery, query, ct);
            if (person is null)
                return PersonCreditMatches.None;

            var credits = await FetchPersonCreditsAsync(
                person.Id, allowSeries, genreIds, yearFrom, yearTo, voteMin, originalLanguage, ct);

            return credits.Count == 0
                ? PersonCreditMatches.None
                : new PersonCreditMatches(credits, person.LeadsResults);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "TMDB person search unavailable");
            return PersonCreditMatches.None;
        }
    }

    private async Task<PersonMatch?> FindBestMatchingPersonAsync(
        string normalizedQuery,
        string rawQuery,
        CancellationToken ct)
    {
        var url = $"{ApiBase}/search/person"
            + $"?query={Uri.EscapeDataString(rawQuery)}&language=fr-FR";

        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty(ResultsProperty, out var results) || results.ValueKind != JsonValueKind.Array)
            return null;

        var candidates = new List<(int Id, bool NameMatchesWholeWords, double Popularity)>();
        foreach (var candidate in results.EnumerateArray())
        {
            if (!candidate.TryGetProperty("name", out var nameElement) || nameElement.ValueKind != JsonValueKind.String)
                continue;
            if (!candidate.TryGetProperty("id", out var idElement) || idElement.ValueKind != JsonValueKind.Number)
                continue;

            var normalizedName = NormalizeSearchText(nameElement.GetString() ?? string.Empty);
            if (!normalizedName.Contains(normalizedQuery, StringComparison.Ordinal))
                continue;

            var popularity = ReadPopularity(candidate);
            if (popularity < MinPersonPopularity)
                continue;

            candidates.Add((
                idElement.GetInt32(),
                MatchesWholeWords(normalizedName, normalizedQuery),
                popularity));
        }

        if (candidates.Count == 0)
            return null;

        var best = candidates
            .OrderByDescending(candidate => candidate.NameMatchesWholeWords)
            .ThenByDescending(candidate => candidate.Popularity)
            .First();

        return new PersonMatch(best.Id, best.NameMatchesWholeWords);
    }

    private static bool MatchesWholeWords(string normalizedName, string normalizedQuery) =>
        $" {normalizedName} ".Contains($" {normalizedQuery} ", StringComparison.Ordinal);

    private async Task<IReadOnlyList<TmdbSearchItem>> FetchPersonCreditsAsync(
        int personId,
        bool allowSeries,
        IReadOnlyList<int>? genreIds,
        int? yearFrom,
        int? yearTo,
        double? voteMin,
        string? originalLanguage,
        CancellationToken ct)
    {
        var url = $"{ApiBase}/person/{personId}/combined_credits?language=fr-FR";

        using var res = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        res.EnsureSuccessStatusCode();

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

        var scored = new List<(double Popularity, TmdbSearchItem Item)>();
        var alreadyKept = new HashSet<(int, MovieMediaType)>();

        foreach (var (property, keepCredit) in PersonCreditSources)
        {
            if (!doc.RootElement.TryGetProperty(property, out var credits) || credits.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var credit in credits.EnumerateArray())
            {
                if (!keepCredit(credit))
                    continue;

                var mapped = TryMapSearchItem(credit, true, genreIds, yearFrom, yearTo, voteMin, originalLanguage);
                if (mapped is null)
                    continue;
                if (!allowSeries && mapped.MediaType != MovieMediaType.Movie)
                    continue;
                if (!alreadyKept.Add((mapped.Id, mapped.MediaType)))
                    continue;

                scored.Add((ReadPopularity(credit), mapped));
            }
        }

        return scored
            .OrderByDescending(entry => entry.Popularity)
            .Take(MaxResults)
            .Select(entry => entry.Item)
            .ToList();
    }

    private static IReadOnlyList<TmdbSearchItem> MergeTitleAndCreditMatches(
        IReadOnlyList<TmdbSearchItem> titleMatches,
        PersonCreditMatches creditMatches)
    {
        if (creditMatches.Items.Count == 0)
            return titleMatches;

        var ordered = creditMatches.LeadsResults
            ? creditMatches.Items.Concat(titleMatches)
            : titleMatches.Concat(creditMatches.Items);

        var alreadyKept = new HashSet<(int, MovieMediaType)>();
        var merged = new List<TmdbSearchItem>(MaxResults);
        foreach (var item in ordered)
        {
            if (merged.Count >= MaxResults)
                break;
            if (alreadyKept.Add((item.Id, item.MediaType)))
                merged.Add(item);
        }

        return merged;
    }

    private static bool IsDirectingCredit(JsonElement credit) =>
        credit.TryGetProperty("job", out var job)
        && job.ValueKind == JsonValueKind.String
        && string.Equals(job.GetString(), "Director", StringComparison.OrdinalIgnoreCase);

    private static double ReadPopularity(JsonElement item) =>
        item.TryGetProperty("popularity", out var popularity) && popularity.ValueKind == JsonValueKind.Number
            ? popularity.GetDouble()
            : 0d;

    private static string NormalizeSearchText(string value)
    {
        var decomposed = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        var separatorPending = false;

        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
                continue;

            if (char.IsLetterOrDigit(character))
            {
                if (separatorPending && builder.Length > 0)
                    builder.Append(' ');
                builder.Append(char.ToLowerInvariant(character));
                separatorPending = false;
            }
            else
            {
                separatorPending = true;
            }
        }

        return builder.ToString();
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

        var itemGenreIds = ReadGenreIdArray(item);
        if (!MatchesGenres(itemGenreIds, genreIds))
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
        var originalTitle = ReadOriginalTitle(item, mediaType.Value);
        return new TmdbSearchItem(id, mediaType.Value, title, year, posterPath, voteAverage, originalTitle, itemGenreIds);
    }

    private static bool MatchesGenres(IReadOnlyList<int> itemGenreIds, IReadOnlyList<int>? genreIds)
    {
        if (!(genreIds?.Count > 0))
            return true;
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
}

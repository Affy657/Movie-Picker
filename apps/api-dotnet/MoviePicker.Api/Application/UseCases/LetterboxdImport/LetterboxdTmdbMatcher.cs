using System.Globalization;
using System.Text;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public static class LetterboxdTmdbMatcher
{
    public const int MaxCandidates = 5;

    private const int YearTolerance = 1;

    public static async Task<IReadOnlyList<TmdbSearchItem>> FindCandidatesAsync(
        ITmdbMovieSearch tmdb,
        string title,
        string year,
        CancellationToken ct)
    {
        var parsedYear = int.TryParse(year, out var y) ? y : (int?)null;

        try
        {
            var results = await tmdb.SearchTitlesAsync(
                title,
                allowSeries: true,
                yearFrom: parsedYear is null ? null : parsedYear - YearTolerance,
                yearTo: parsedYear is null ? null : parsedYear + YearTolerance,
                ct: ct);
            var expected = Normalize(title);
            var sameYear = year.Trim();
            return results
                .OrderByDescending(c => HasTitle(c, expected))
                .ThenByDescending(c => sameYear.Length > 0 && c.Year == sameYear)
                .Take(MaxCandidates)
                .ToList();
        }
        catch (HttpRequestException)
        {
            return [];
        }
    }

    public static TmdbSearchItem? SelectConfident(
        string letterboxdTitle,
        string letterboxdYear,
        IReadOnlyList<TmdbSearchItem> candidates)
    {
        var expected = Normalize(letterboxdTitle);
        if (expected.Length == 0)
            return null;

        var exactMovies = candidates
            .Where(c => c.MediaType == MovieMediaType.Movie)
            .Where(c => HasTitle(c, expected))
            .ToList();

        if (exactMovies.Count == 1)
            return exactMovies[0];

        var year = letterboxdYear.Trim();
        if (exactMovies.Count < 2 || year.Length == 0)
            return null;

        var sameYear = exactMovies.Where(c => c.Year == year).ToList();
        return sameYear.Count == 1 ? sameYear[0] : null;
    }

    private static bool HasTitle(TmdbSearchItem candidate, string normalizedTitle) =>
        normalizedTitle.Length > 0
        && (Normalize(candidate.OriginalTitle) == normalizedTitle || Normalize(candidate.Title) == normalizedTitle);

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var decomposed = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
                continue;
            if (char.IsLetterOrDigit(c))
                builder.Append(char.ToLowerInvariant(c));
        }

        return builder.ToString();
    }
}

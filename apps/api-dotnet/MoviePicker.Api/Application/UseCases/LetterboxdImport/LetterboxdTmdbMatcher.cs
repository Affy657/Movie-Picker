using System.Globalization;
using System.Text;
using MoviePicker.Api.Application.Ports;

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
            var results = await tmdb.SearchAsync(
                title,
                allowSeries: true,
                yearFrom: parsedYear is null ? null : parsedYear - YearTolerance,
                yearTo: parsedYear is null ? null : parsedYear + YearTolerance,
                ct: ct);
            return results.Take(MaxCandidates).ToList();
        }
        catch (HttpRequestException)
        {
            return [];
        }
    }

    public static TmdbSearchItem? SelectConfident(
        string letterboxdTitle,
        IReadOnlyList<TmdbSearchItem> candidates)
    {
        var expected = Normalize(letterboxdTitle);
        if (expected.Length == 0)
            return null;

        var exact = candidates
            .Where(c => Normalize(c.OriginalTitle) == expected || Normalize(c.Title) == expected)
            .ToList();

        return exact.Count == 1 ? exact[0] : null;
    }

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

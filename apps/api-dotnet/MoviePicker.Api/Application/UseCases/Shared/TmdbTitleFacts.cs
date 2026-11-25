using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class TmdbTitleFacts
{
    public static async Task<TmdbMovieDetails?> FetchDetailsBestEffortAsync(
        ITmdbMovieSearch tmdb,
        ILogger logger,
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct)
    {
        try
        {
            return await tmdb.GetDetailsAsync(tmdbId, mediaType, CatalogLanguage.French, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "TMDB details lookup failed for {TmdbId}, title saved with the genres of its search result and without facts",
                tmdbId);
            return null;
        }
    }

    private const int YearLength = 4;

    public static string? ReleaseYear(string? releaseDate) =>
        releaseDate is { Length: >= YearLength } && releaseDate[..YearLength].All(char.IsAsciiDigit)
            ? releaseDate[..YearLength]
            : null;

    public static int? RuntimeMinutes(int? requested, TmdbMovieDetails? details) =>
        Known(requested) ?? Known(details?.Runtime) ?? requested;

    public static IReadOnlyList<int> GenreIds(IReadOnlyList<int>? requested, TmdbMovieDetails? details) =>
        details?.GenreIds ?? SearchResultGenres(requested);

    private static int? Known(int? runtimeMinutes) => runtimeMinutes is > 0 ? runtimeMinutes : null;

    private static List<int> SearchResultGenres(IReadOnlyList<int>? genreIds) =>
        genreIds is null ? [] : genreIds.Where(id => id > 0).Distinct().ToList();
}

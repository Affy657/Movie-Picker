using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed record LetterboxdResolution(
    TmdbSearchItem? Confident,
    LetterboxdImportRowResponse? Pending,
    string? Unmatched);

public sealed class LetterboxdTitleResolver
{
    private readonly ITmdbMovieSearch _tmdb;

    public LetterboxdTitleResolver(ITmdbMovieSearch tmdb)
    {
        _tmdb = tmdb;
    }

    public async Task<LetterboxdResolution> ResolveAsync(
        int rowIndex,
        LetterboxdFilm film,
        LetterboxdImportTarget target,
        CancellationToken ct)
    {
        var candidates = await LetterboxdTmdbMatcher.FindCandidatesAsync(_tmdb, film.Title, film.Year, ct);
        if (candidates.Count == 0)
            return new LetterboxdResolution(null, null, FormatFilm(film));

        var confident = LetterboxdTmdbMatcher.SelectConfident(film.Title, film.Year, candidates);
        return confident is null
            ? new LetterboxdResolution(null, await ToRowAsync(rowIndex, film, target, candidates, ct), null)
            : new LetterboxdResolution(confident, null, null);
    }

    public static int TotalTruncated(LetterboxdFilmsSnapshot snapshot, int unknownFilms) =>
        Math.Max(0, snapshot.Total - snapshot.Films.Count) + Math.Max(0, unknownFilms - LetterboxdImportLimits.MaxRows);

    private static string FormatFilm(LetterboxdFilm film) =>
        film.Year.Length > 0 ? $"{film.Title} ({film.Year})" : film.Title;

    private async Task<LetterboxdImportRowResponse> ToRowAsync(
        int rowIndex,
        LetterboxdFilm film,
        LetterboxdImportTarget target,
        IReadOnlyList<TmdbSearchItem> candidates,
        CancellationToken ct)
    {
        var runtimes = await Task.WhenAll(candidates.Select(c => GetRuntimeAsync(c.Id, c.MediaType, ct)));
        var withCandidates = candidates.Select((c, i) => new LetterboxdImportCandidateResponse
        {
            TmdbId = c.Id,
            MediaType = c.MediaType,
            Title = c.Title,
            Year = c.Year,
            PosterPath = c.PosterPath,
            VoteAverage = c.VoteAverage,
            GenreIds = c.GenreIds ?? [],
            RuntimeMinutes = runtimes[i]
        }).ToList();

        return new LetterboxdImportRowResponse
        {
            RowIndex = rowIndex,
            Title = film.Title,
            Year = film.Year,
            LetterboxdSlug = film.Slug,
            Target = target,
            Rating = target == LetterboxdImportTarget.Watched ? film.Rating : null,
            WatchedOn = target == LetterboxdImportTarget.Watched ? film.WatchedOn : null,
            Candidates = withCandidates
        };
    }

    private async Task<int?> GetRuntimeAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct)
    {
        try
        {
            var details = await _tmdb.GetDetailsAsync(tmdbId, mediaType, CatalogLanguage.French, ct);
            return details?.Runtime;
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }
}

using System.Collections.Concurrent;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class PreviewLetterboxdImportHandler : IPreviewLetterboxdImportHandler
{
    private const int MaxParallelism = 5;
    private const int MaxCandidatesPerRow = 5;
    private const int YearTolerance = 1;

    private readonly IWatchlistRepository _watchlist;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly IUserRepository _users;
    private readonly ILetterboxdWatchlistClient _letterboxd;

    public PreviewLetterboxdImportHandler(
        IWatchlistRepository watchlist,
        ITmdbMovieSearch tmdb,
        IUserRepository users,
        ILetterboxdWatchlistClient letterboxd)
    {
        _watchlist = watchlist;
        _tmdb = tmdb;
        _users = users;
        _letterboxd = letterboxd;
    }

    public async Task<LetterboxdImportPreviewResponse> HandleAsync(
        string userId,
        LetterboxdImportPreviewRequest request,
        CancellationToken ct = default)
    {
        var parsed = LetterboxdCsvParser.Parse(request.Csv);
        var rows = parsed.Rows
            .Select(r => new SourceRow(r.RowIndex, r.Title, r.Year, null))
            .ToList();

        return await BuildPreviewAsync(userId, rows, parsed.TotalParsed, parsed.TotalTruncated, ct);
    }

    public async Task<LetterboxdImportPreviewResponse> HandleFromAccountAsync(
        string userId,
        CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw new NotFoundException("Utilisateur introuvable.");

        if (string.IsNullOrWhiteSpace(user.LetterboxdUsername))
            throw new BadRequestException("Aucun pseudo Letterboxd enregistré sur votre compte.");

        var snapshot = await _letterboxd.GetWatchlistAsync(user.LetterboxdUsername, ct);
        if (!snapshot.IsComplete)
        {
            throw new BadRequestException(
                "Watchlist Letterboxd inaccessible. Vérifiez le pseudo et que votre profil est public, "
                + "ou importez le fichier watchlist.csv.");
        }

        var totalParsed = snapshot.Films.Count;
        var rows = snapshot.Films
            .Take(LetterboxdImportLimits.MaxRows)
            .Select((f, i) => new SourceRow(i + 1, f.Title, f.Year, f.Slug))
            .ToList();

        return await BuildPreviewAsync(
            userId,
            rows,
            totalParsed,
            Math.Max(0, totalParsed - LetterboxdImportLimits.MaxRows),
            ct);
    }

    private async Task<LetterboxdImportPreviewResponse> BuildPreviewAsync(
        string userId,
        IReadOnlyList<SourceRow> rows,
        int totalParsed,
        int totalTruncated,
        CancellationToken ct)
    {
        var existingItems = await _watchlist.ListByUserIdAsync(userId, int.MaxValue, ct);
        var existingTitleYears = existingItems
            .Select(i => (i.Title.Trim().ToLowerInvariant(), i.Year.Trim()))
            .ToHashSet();
        var existingSlugs = existingItems
            .Where(i => !string.IsNullOrEmpty(i.LetterboxdSlug))
            .Select(i => i.LetterboxdSlug!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var rowsByIndex = new ConcurrentDictionary<int, LetterboxdImportRowResponse>();

        await Parallel.ForEachAsync(
            rows,
            new ParallelOptions { MaxDegreeOfParallelism = MaxParallelism, CancellationToken = ct },
            async (row, rowCt) =>
            {
                var alreadyInWatchlist =
                    (row.Slug is not null && existingSlugs.Contains(row.Slug))
                    || existingTitleYears.Contains((row.Title.ToLowerInvariant(), row.Year));
                var candidates = alreadyInWatchlist
                    ? []
                    : await SearchCandidatesAsync(row, rowCt);

                rowsByIndex[row.RowIndex] = new LetterboxdImportRowResponse
                {
                    RowIndex = row.RowIndex,
                    Title = row.Title,
                    Year = row.Year,
                    LetterboxdSlug = row.Slug,
                    AlreadyInWatchlist = alreadyInWatchlist,
                    Candidates = candidates
                };
            });

        var orderedRows = rowsByIndex.Values.OrderBy(r => r.RowIndex).ToList();

        return new LetterboxdImportPreviewResponse
        {
            Rows = orderedRows,
            TotalParsed = totalParsed,
            TotalTruncated = totalTruncated
        };
    }

    private async Task<IReadOnlyList<LetterboxdImportCandidateResponse>> SearchCandidatesAsync(
        SourceRow row,
        CancellationToken ct)
    {
        var year = int.TryParse(row.Year, out var parsedYear) ? parsedYear : (int?)null;

        IReadOnlyList<TmdbSearchItem> results;
        try
        {
            results = await _tmdb.SearchAsync(
                row.Title,
                allowSeries: false,
                yearFrom: year is null ? null : year - YearTolerance,
                yearTo: year is null ? null : year + YearTolerance,
                ct: ct);
        }
        catch (HttpRequestException)
        {
            return [];
        }

        return results
            .Take(MaxCandidatesPerRow)
            .Select(ToCandidateResponse)
            .ToList();
    }

    private static LetterboxdImportCandidateResponse ToCandidateResponse(TmdbSearchItem item) => new()
    {
        TmdbId = item.Id,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        PosterPath = item.PosterPath,
        VoteAverage = item.VoteAverage
    };

    private sealed record SourceRow(int RowIndex, string Title, string Year, string? Slug);
}

using System.Collections.Concurrent;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class PreviewLetterboxdImportHandler : IPreviewLetterboxdImportHandler
{
    private const int MaxParallelism = 5;
    private const int MaxCandidatesPerRow = 5;
    private const int YearTolerance = 1;

    private readonly IWatchlistRepository _watchlist;
    private readonly ITmdbMovieSearch _tmdb;

    public PreviewLetterboxdImportHandler(IWatchlistRepository watchlist, ITmdbMovieSearch tmdb)
    {
        _watchlist = watchlist;
        _tmdb = tmdb;
    }

    public async Task<LetterboxdImportPreviewResponse> HandleAsync(
        string userId,
        LetterboxdImportPreviewRequest request,
        CancellationToken ct = default)
    {
        var parsed = LetterboxdCsvParser.Parse(request.Csv);

        var existingItems = await _watchlist.ListByUserIdAsync(userId, int.MaxValue, ct);
        var existingKeys = existingItems
            .Select(i => (i.Title.Trim().ToLowerInvariant(), i.Year.Trim()))
            .ToHashSet();

        var rowsByIndex = new ConcurrentDictionary<int, LetterboxdImportRowResponse>();

        await Parallel.ForEachAsync(
            parsed.Rows,
            new ParallelOptions { MaxDegreeOfParallelism = MaxParallelism, CancellationToken = ct },
            async (row, rowCt) =>
            {
                var alreadyInWatchlist = existingKeys.Contains((row.Title.ToLowerInvariant(), row.Year));
                var candidates = alreadyInWatchlist
                    ? []
                    : await SearchCandidatesAsync(row, rowCt);

                rowsByIndex[row.RowIndex] = new LetterboxdImportRowResponse
                {
                    RowIndex = row.RowIndex,
                    Title = row.Title,
                    Year = row.Year,
                    AlreadyInWatchlist = alreadyInWatchlist,
                    Candidates = candidates
                };
            });

        var orderedRows = rowsByIndex.Values.OrderBy(r => r.RowIndex).ToList();

        return new LetterboxdImportPreviewResponse
        {
            Rows = orderedRows,
            TotalParsed = parsed.TotalParsed,
            TotalTruncated = parsed.TotalTruncated
        };
    }

    private async Task<IReadOnlyList<LetterboxdImportCandidateResponse>> SearchCandidatesAsync(
        LetterboxdCsvRow row,
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
}

using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public interface IReadLetterboxdExportHandler
{
    LetterboxdExportResponse Handle(LetterboxdExportReadRequest request);
}

public interface IImportLetterboxdExportHandler
{
    Task<LetterboxdExportImportResponse> HandleAsync(
        string userId,
        LetterboxdExportImportRequest request,
        CancellationToken ct = default);
}

public sealed class ReadLetterboxdExportHandler : IReadLetterboxdExportHandler
{
    public LetterboxdExportResponse Handle(LetterboxdExportReadRequest request)
    {
        var export = LetterboxdExportReader.Read([.. request.Files.Select(Decode)]);
        return new LetterboxdExportResponse
        {
            Watchlist = [.. export.Watchlist.Select(ToResponse)],
            Watched = [.. export.Watched.Select(ToResponse)],
        };
    }

    private static LetterboxdExportFile Decode(LetterboxdExportFileRequest file)
    {
        try
        {
            return new LetterboxdExportFile(file.Name, Convert.FromBase64String(file.Base64Content));
        }
        catch (FormatException)
        {
            throw Errors.LetterboxdExportUnreadable();
        }
    }

    private static LetterboxdExportFilmResponse ToResponse(LetterboxdExportFilm film) => new()
    {
        Title = film.Title,
        Year = film.Year,
        Rating = film.Rating,
        WatchedOn = film.WatchedOn,
    };
}

public sealed class ImportLetterboxdExportHandler : IImportLetterboxdExportHandler
{
    private const int ParallelLookups = 4;

    private readonly LetterboxdTitleResolver _resolver;
    private readonly LetterboxdSelectionsWriter _writer;
    private readonly LetterboxdLinkedCounter _linkedCounter;
    private readonly IUserRepository _users;

    public ImportLetterboxdExportHandler(
        ITmdbMovieSearch tmdb,
        LetterboxdSelectionsWriter writer,
        LetterboxdLinkedCounter linkedCounter,
        IUserRepository users)
    {
        _resolver = new LetterboxdTitleResolver(tmdb);
        _writer = writer;
        _linkedCounter = linkedCounter;
        _users = users;
    }

    public async Task<LetterboxdExportImportResponse> HandleAsync(
        string userId,
        LetterboxdExportImportRequest request,
        CancellationToken ct = default)
    {
        if (request.Rows.Count > LetterboxdExportImportRequest.MaxRows)
            throw Errors.TooManySelections(LetterboxdExportImportRequest.MaxRows);
        await _users.RequireAccountAsync(userId, ct);

        var resolutions = await ResolveAsync(request, ct);
        var pending = new List<LetterboxdImportRowResponse>();
        var unmatched = new List<string>();
        var confident = new List<(LetterboxdExportRowRequest Row, TmdbSearchItem Item)>();
        foreach (var (row, resolution) in request.Rows.Zip(resolutions))
        {
            if (resolution.Confident is { } item)
                confident.Add((row, item));
            else if (resolution.Pending is { } choice)
                pending.Add(choice);
            else if (resolution.Unmatched is { } title)
                unmatched.Add(title);
        }

        var written = request.Target == LetterboxdImportTarget.Watched
            ? await _writer.WriteWatchedAsync(userId, [.. confident.Select(pair => ToWatched(pair.Row, pair.Item))], ct)
            : await _writer.WriteWatchlistAsync(userId, [.. confident.Select(pair => ToWatchlist(pair.Item))], ct);
        if (written.Added > 0)
            await _linkedCounter.RefreshAsync(userId, ct);

        return new LetterboxdExportImportResponse
        {
            Added = written.Added,
            AlreadyPresent = written.AlreadyPresent,
            PendingChoices = pending,
            UnmatchedTitles = unmatched,
        };
    }

    private async Task<LetterboxdResolution[]> ResolveAsync(LetterboxdExportImportRequest request, CancellationToken ct)
    {
        var resolutions = new LetterboxdResolution[request.Rows.Count];
        await Parallel.ForEachAsync(
            Enumerable.Range(0, request.Rows.Count),
            new ParallelOptions { MaxDegreeOfParallelism = ParallelLookups, CancellationToken = ct },
            async (index, token) =>
            {
                var row = request.Rows[index];
                var film = new LetterboxdFilm(string.Empty, row.Title.Trim(), row.Year.Trim(), row.Rating, row.WatchedOn);
                resolutions[index] = await _resolver.ResolveAsync(row.RowIndex, film, request.Target, token);
            });
        return resolutions;
    }

    private static AddWatchlistItemRequest ToWatchlist(TmdbSearchItem item) => new()
    {
        TmdbId = item.Id,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        PosterPath = item.PosterPath,
        VoteAverage = item.VoteAverage,
        GenreIds = item.GenreIds,
    };

    private static LetterboxdWatchedSelectionRequest ToWatched(LetterboxdExportRowRequest row, TmdbSearchItem item) => new()
    {
        TmdbId = item.Id,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        PosterPath = item.PosterPath,
        VoteAverage = item.VoteAverage,
        GenreIds = item.GenreIds,
        Rating = row.Rating,
        WatchedOn = row.WatchedOn,
    };
}

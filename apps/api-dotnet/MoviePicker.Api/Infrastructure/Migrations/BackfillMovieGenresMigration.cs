using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class BackfillMovieGenresMigration : IDataMigration
{
    private const int BatchSize = 100;

    private readonly IMovieRepository _movies;
    private readonly IWatchlistRepository _watchlist;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly ILogger<BackfillMovieGenresMigration> _logger;

    public BackfillMovieGenresMigration(
        IMovieRepository movies,
        IWatchlistRepository watchlist,
        ITmdbMovieSearch tmdb,
        ILogger<BackfillMovieGenresMigration> logger)
    {
        _movies = movies;
        _watchlist = watchlist;
        _tmdb = tmdb;
        _logger = logger;
    }

    public string Id => "2026-09-05-002-backfill-movie-genres";

    public async Task<long> ExecuteAsync(CancellationToken ct = default)
    {
        var movies = await BackfillSteps.RunBatchesAsync<Movie>(
            _movies.ListMissingGenresAsync,
            movie => movie.Id,
            BackfillMovieAsync,
            (movie, ex) => _logger.LogWarning(
                ex,
                "Genres not fetched for movie {MovieId} (TMDB {TmdbId})",
                movie.Id,
                movie.TmdbId),
            BatchSize,
            ct);

        var watchlist = await BackfillSteps.RunBatchesAsync<WatchlistItem>(
            _watchlist.ListMissingGenresAsync,
            item => item.Id,
            BackfillWatchlistItemAsync,
            (item, ex) => _logger.LogWarning(
                ex,
                "Genres not fetched for watchlist item {ItemId} (TMDB {TmdbId})",
                item.Id,
                item.TmdbId),
            BatchSize,
            ct);

        return (movies + watchlist).Completed(Id);
    }

    private async Task<bool> BackfillMovieAsync(Movie movie, CancellationToken ct)
    {
        var details = await _tmdb.GetDetailsAsync(movie.TmdbId, movie.MediaType, ct);
        if (details is not { GenreIds.Count: > 0 })
            return false;

        await _movies.UpdateGenresAsync(movie.Id, details.GenreIds, ct);
        return true;
    }

    private async Task<bool> BackfillWatchlistItemAsync(WatchlistItem item, CancellationToken ct)
    {
        var details = await _tmdb.GetDetailsAsync(item.TmdbId, item.MediaType, ct);
        if (details is not { GenreIds.Count: > 0 })
            return false;

        await _watchlist.UpdateGenresAsync(item.Id, details.GenreIds, ct);
        return true;
    }
}

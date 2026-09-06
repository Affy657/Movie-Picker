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
        var updated = await BackfillSteps.RunBatchesAsync<Movie>(
            _movies.ListMissingGenresAsync,
            movie => movie.Id,
            TryBackfillMovieAsync,
            BatchSize,
            ct);

        updated += await BackfillSteps.RunBatchesAsync<WatchlistItem>(
            _watchlist.ListMissingGenresAsync,
            item => item.Id,
            TryBackfillWatchlistItemAsync,
            BatchSize,
            ct);

        return updated;
    }

    private Task<bool> TryBackfillMovieAsync(Movie movie, CancellationToken ct) =>
        BackfillSteps.TryApplyAsync(
            async () =>
            {
                var details = await _tmdb.GetDetailsAsync(movie.TmdbId, movie.MediaType, ct);
                if (details is not { GenreIds.Count: > 0 })
                    return false;

                await _movies.UpdateGenresAsync(movie.Id, details.GenreIds, ct);
                return true;
            },
            ex => _logger.LogWarning(
                ex,
                "Genres non récupérés pour le film {MovieId} (TMDB {TmdbId})",
                movie.Id,
                movie.TmdbId));

    private Task<bool> TryBackfillWatchlistItemAsync(WatchlistItem item, CancellationToken ct) =>
        BackfillSteps.TryApplyAsync(
            async () =>
            {
                var details = await _tmdb.GetDetailsAsync(item.TmdbId, item.MediaType, ct);
                if (details is not { GenreIds.Count: > 0 })
                    return false;

                await _watchlist.UpdateGenresAsync(item.Id, details.GenreIds, ct);
                return true;
            },
            ex => _logger.LogWarning(
                ex,
                "Genres non récupérés pour l'item de watchlist {ItemId} (TMDB {TmdbId})",
                item.Id,
                item.TmdbId));
}

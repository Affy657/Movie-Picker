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
        var updated = await BackfillMoviesAsync(ct);
        updated += await BackfillWatchlistAsync(ct);
        return updated;
    }

    private async Task<long> BackfillMoviesAsync(CancellationToken ct)
    {
        var attempted = new HashSet<string>();
        var updated = 0L;

        while (true)
        {
            ct.ThrowIfCancellationRequested();
            var batch = await _movies.ListMissingGenresAsync(BatchSize, ct);
            var fresh = batch.Where(m => attempted.Add(m.Id)).ToList();
            if (fresh.Count == 0)
                return updated;

            foreach (var movie in fresh)
            {
                ct.ThrowIfCancellationRequested();
                if (await TryBackfillMovieAsync(movie, ct))
                    updated++;
            }
        }
    }

    private async Task<long> BackfillWatchlistAsync(CancellationToken ct)
    {
        var attempted = new HashSet<string>();
        var updated = 0L;

        while (true)
        {
            ct.ThrowIfCancellationRequested();
            var batch = await _watchlist.ListMissingGenresAsync(BatchSize, ct);
            var fresh = batch.Where(i => attempted.Add(i.Id)).ToList();
            if (fresh.Count == 0)
                return updated;

            foreach (var item in fresh)
            {
                ct.ThrowIfCancellationRequested();
                if (await TryBackfillWatchlistItemAsync(item, ct))
                    updated++;
            }
        }
    }

    private async Task<bool> TryBackfillMovieAsync(Movie movie, CancellationToken ct)
    {
        try
        {
            var details = await _tmdb.GetDetailsAsync(movie.TmdbId, movie.MediaType, ct);
            if (details is not { GenreIds.Count: > 0 })
                return false;

            await _movies.UpdateGenresAsync(movie.Id, details.GenreIds, ct);
            return true;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(
                ex,
                "Genres non récupérés pour le film {MovieId} (TMDB {TmdbId})",
                movie.Id,
                movie.TmdbId);
            return false;
        }
    }

    private async Task<bool> TryBackfillWatchlistItemAsync(WatchlistItem item, CancellationToken ct)
    {
        try
        {
            var details = await _tmdb.GetDetailsAsync(item.TmdbId, item.MediaType, ct);
            if (details is not { GenreIds.Count: > 0 })
                return false;

            await _watchlist.UpdateGenresAsync(item.Id, details.GenreIds, ct);
            return true;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(
                ex,
                "Genres non récupérés pour l'item de watchlist {ItemId} (TMDB {TmdbId})",
                item.Id,
                item.TmdbId);
            return false;
        }
    }
}

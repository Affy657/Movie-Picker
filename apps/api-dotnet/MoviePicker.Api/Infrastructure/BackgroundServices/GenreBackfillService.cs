using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.BackgroundServices;

/// <summary>
/// One-shot backfill that fetches and stores TMDB genre IDs on movies and watchlist items added
/// before genre tracking existed. Runs in the background AFTER the host has started so it never
/// blocks Kestrel, and self-terminates once nothing is left without genres (re-running it on
/// every startup is a no-op as soon as the backfill is complete).
/// </summary>
public sealed class GenreBackfillService : BackgroundService
{
    private static readonly TimeSpan StartupDelay = TimeSpan.FromSeconds(5);
    private const int BatchSize = 100;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GenreBackfillService> _logger;

    public GenreBackfillService(IServiceScopeFactory scopeFactory, ILogger<GenreBackfillService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let the app finish starting (and bind Kestrel) before doing any DB / TMDB work.
        try
        {
            await Task.Delay(StartupDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var movies = scope.ServiceProvider.GetRequiredService<IMovieRepository>();
            var watchlist = scope.ServiceProvider.GetRequiredService<IWatchlistRepository>();
            var tmdb = scope.ServiceProvider.GetRequiredService<ITmdbMovieSearch>();

            await BackfillMoviesAsync(movies, tmdb, stoppingToken);
            await BackfillWatchlistAsync(watchlist, tmdb, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            // Shutdown requested mid-backfill — fine, it resumes on next startup.
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Échec du backfill des genres de films");
        }
    }

    private async Task BackfillMoviesAsync(
        IMovieRepository movies,
        ITmdbMovieSearch tmdb,
        CancellationToken stoppingToken)
    {
        var attempted = new HashSet<string>();
        var updated = 0;
        while (!stoppingToken.IsCancellationRequested)
        {
            var batch = await movies.ListMissingGenresAsync(BatchSize, stoppingToken);
            var fresh = batch.Where(m => attempted.Add(m.Id)).ToList();
            if (fresh.Count == 0)
                break;

            foreach (var movie in fresh)
            {
                if (stoppingToken.IsCancellationRequested)
                    break;
                if (await TryBackfillMovieGenresAsync(movie, tmdb, movies, stoppingToken))
                    updated++;
            }
        }

        if (attempted.Count > 0)
            _logger.LogInformation("Backfill genres terminé : {Updated}/{Processed} films mis à jour", updated, attempted.Count);
    }

    private async Task BackfillWatchlistAsync(
        IWatchlistRepository watchlist,
        ITmdbMovieSearch tmdb,
        CancellationToken stoppingToken)
    {
        var attemptedWatchlist = new HashSet<string>();
        var updatedWatchlist = 0;
        while (!stoppingToken.IsCancellationRequested)
        {
            var batch = await watchlist.ListMissingGenresAsync(BatchSize, stoppingToken);
            var fresh = batch.Where(i => attemptedWatchlist.Add(i.Id)).ToList();
            if (fresh.Count == 0)
                break;

            foreach (var item in fresh)
            {
                if (stoppingToken.IsCancellationRequested)
                    break;
                if (await TryBackfillWatchlistItemGenresAsync(item, tmdb, watchlist, stoppingToken))
                    updatedWatchlist++;
            }
        }

        if (attemptedWatchlist.Count > 0)
            _logger.LogInformation("Backfill genres terminé : {Updated}/{Processed} items de watchlist mis à jour", updatedWatchlist, attemptedWatchlist.Count);
    }

    private async Task<bool> TryBackfillMovieGenresAsync(
        Movie movie,
        ITmdbMovieSearch tmdb,
        IMovieRepository movies,
        CancellationToken ct)
    {
        try
        {
            var details = await tmdb.GetDetailsAsync(movie.TmdbId, movie.MediaType, ct);
            if (details is { GenreIds.Count: > 0 })
            {
                await movies.UpdateGenresAsync(movie.Id, details.GenreIds, ct);
                return true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Échec backfill genres pour le film {MovieId} (TMDB {TmdbId})", movie.Id, movie.TmdbId);
        }
        return false;
    }

    private async Task<bool> TryBackfillWatchlistItemGenresAsync(
        WatchlistItem item,
        ITmdbMovieSearch tmdb,
        IWatchlistRepository watchlist,
        CancellationToken ct)
    {
        try
        {
            var details = await tmdb.GetDetailsAsync(item.TmdbId, item.MediaType, ct);
            if (details is { GenreIds.Count: > 0 })
            {
                await watchlist.UpdateGenresAsync(item.Id, details.GenreIds, ct);
                return true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Échec backfill genres pour l'item de watchlist {ItemId} (TMDB {TmdbId})", item.Id, item.TmdbId);
        }
        return false;
    }
}

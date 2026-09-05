using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.BackgroundServices;

public sealed class RuntimeBackfillService : BackgroundService
{
    private static readonly TimeSpan StartupDelay = TimeSpan.FromSeconds(45);
    private const int BatchSize = 100;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RuntimeBackfillService> _logger;

    public RuntimeBackfillService(IServiceScopeFactory scopeFactory, ILogger<RuntimeBackfillService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
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
            var watchlist = scope.ServiceProvider.GetRequiredService<IWatchlistRepository>();
            var tmdb = scope.ServiceProvider.GetRequiredService<ITmdbMovieSearch>();

            var attempted = new HashSet<string>();
            var updated = 0;
            while (!stoppingToken.IsCancellationRequested)
            {
                var batch = await watchlist.ListMissingRuntimeAsync(BatchSize, stoppingToken);
                var fresh = batch.Where(i => attempted.Add(i.Id)).ToList();
                if (fresh.Count == 0)
                    break;

                foreach (var item in fresh)
                {
                    if (stoppingToken.IsCancellationRequested)
                        break;
                    if (await TryBackfillWatchlistItemRuntimeAsync(item, tmdb, watchlist, stoppingToken))
                        updated++;
                }
            }

            if (attempted.Count > 0)
                _logger.LogInformation("Backfill durée terminé : {Updated}/{Processed} items de watchlist mis à jour", updated, attempted.Count);
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Échec du backfill des durées de films");
        }
    }

    private async Task<bool> TryBackfillWatchlistItemRuntimeAsync(
        WatchlistItem item,
        ITmdbMovieSearch tmdb,
        IWatchlistRepository watchlist,
        CancellationToken ct)
    {
        try
        {
            var details = await tmdb.GetDetailsAsync(item.TmdbId, item.MediaType, ct);
            if (details is null)
                return false;

            await watchlist.UpdateRuntimeAsync(item.Id, Math.Max(0, details.Runtime ?? 0), ct);
            return details.Runtime is > 0;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Échec backfill durée pour l'item de watchlist {ItemId} (TMDB {TmdbId})", item.Id, item.TmdbId);
            return false;
        }
    }
}

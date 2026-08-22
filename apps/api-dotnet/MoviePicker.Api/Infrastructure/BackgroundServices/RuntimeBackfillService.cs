using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.BackgroundServices;

/// <summary>
/// One-shot backfill that fetches and stores TMDB runtime on watchlist items added before runtime
/// tracking existed. Runs in the background AFTER the host has started so it never blocks Kestrel,
/// and self-terminates once nothing is left without a runtime (re-running it on every startup is a
/// no-op as soon as the backfill is complete). Mirrors <see cref="GenreBackfillService"/>.
/// </summary>
public sealed class RuntimeBackfillService : BackgroundService
{
    // Staggered well past GenreBackfillService's own 5s delay so the two one-shot backfills
    // don't both hammer TMDB concurrently right after every restart.
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

            // Items whose runtime TMDB can't supply stay "missing"; tracking attempted ids
            // guarantees termination instead of re-reading the same rows forever.
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
            // Shutdown requested mid-backfill — fine, it resumes on next startup.
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

            // TMDB answered but has no runtime for this item (common for TV): persist the 0
            // sentinel so ListMissingRuntimeAsync stops re-selecting it on every future restart.
            // A thrown exception above (transient failure) leaves the field untouched so it's
            // retried next time, unlike this confirmed "no data" case.
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

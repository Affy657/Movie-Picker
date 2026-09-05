using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class BackfillWatchlistRuntimesMigration : IDataMigration
{
    private const int BatchSize = 100;

    private readonly IWatchlistRepository _watchlist;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly ILogger<BackfillWatchlistRuntimesMigration> _logger;

    public BackfillWatchlistRuntimesMigration(
        IWatchlistRepository watchlist,
        ITmdbMovieSearch tmdb,
        ILogger<BackfillWatchlistRuntimesMigration> logger)
    {
        _watchlist = watchlist;
        _tmdb = tmdb;
        _logger = logger;
    }

    public string Id => "2026-09-05-003-backfill-watchlist-runtimes";

    public async Task<long> ExecuteAsync(CancellationToken ct = default)
    {
        var attempted = new HashSet<string>();
        var updated = 0L;

        while (true)
        {
            ct.ThrowIfCancellationRequested();
            var batch = await _watchlist.ListMissingRuntimeAsync(BatchSize, ct);
            var fresh = batch.Where(i => attempted.Add(i.Id)).ToList();
            if (fresh.Count == 0)
                return updated;

            foreach (var item in fresh)
            {
                ct.ThrowIfCancellationRequested();
                if (await TryBackfillRuntimeAsync(item, ct))
                    updated++;
            }
        }
    }

    private async Task<bool> TryBackfillRuntimeAsync(WatchlistItem item, CancellationToken ct)
    {
        try
        {
            var details = await _tmdb.GetDetailsAsync(item.TmdbId, item.MediaType, ct);
            if (details is null)
                return false;

            await _watchlist.UpdateRuntimeAsync(item.Id, Math.Max(0, details.Runtime ?? 0), ct);
            return details.Runtime is > 0;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(
                ex,
                "Durée non récupérée pour l'item de watchlist {ItemId} (TMDB {TmdbId})",
                item.Id,
                item.TmdbId);
            return false;
        }
    }
}

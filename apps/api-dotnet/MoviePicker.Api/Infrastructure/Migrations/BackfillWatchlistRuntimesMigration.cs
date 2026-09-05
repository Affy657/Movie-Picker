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

    public Task<long> ExecuteAsync(CancellationToken ct = default) =>
        BackfillSteps.RunBatchesAsync<WatchlistItem>(
            _watchlist.ListMissingRuntimeAsync,
            item => item.Id,
            TryBackfillRuntimeAsync,
            BatchSize,
            ct);

    private Task<bool> TryBackfillRuntimeAsync(WatchlistItem item, CancellationToken ct) =>
        BackfillSteps.TryApplyAsync(
            async () =>
            {
                var details = await _tmdb.GetDetailsAsync(item.TmdbId, item.MediaType, ct);
                if (details is null)
                    return false;

                await _watchlist.UpdateRuntimeAsync(item.Id, Math.Max(0, details.Runtime ?? 0), ct);
                return details.Runtime is > 0;
            },
            ex => _logger.LogWarning(
                ex,
                "Durée non récupérée pour l'item de watchlist {ItemId} (TMDB {TmdbId})",
                item.Id,
                item.TmdbId));
}

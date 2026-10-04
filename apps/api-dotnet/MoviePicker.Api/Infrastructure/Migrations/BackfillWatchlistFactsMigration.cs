using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class BackfillWatchlistFactsMigration : IDataMigration
{
    private const int BatchSize = 100;

    private readonly IWatchlistRepository _watchlist;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly ILogger<BackfillWatchlistFactsMigration> _logger;

    public BackfillWatchlistFactsMigration(
        IWatchlistRepository watchlist,
        ITmdbMovieSearch tmdb,
        ILogger<BackfillWatchlistFactsMigration> logger)
    {
        _watchlist = watchlist;
        _tmdb = tmdb;
        _logger = logger;
    }

    public string Id => "2026-09-20-001-backfill-watchlist-facts";

    public async Task<long> ExecuteAsync(CancellationToken ct = default)
    {
        var outcome = await BackfillSteps.RunBatchesAsync<WatchlistItem>(
            _watchlist.ListMissingFactsAsync,
            item => item.Id,
            BackfillFactsAsync,
            (item, ex) => _logger.LogWarning(
                ex,
                "Facts not fetched for watchlist item {ItemId} (TMDB {TmdbId})",
                item.Id,
                item.TmdbId),
            BatchSize,
            ct);

        return outcome.Completed(Id);
    }

    private async Task<bool> BackfillFactsAsync(WatchlistItem item, CancellationToken ct)
    {
        var details = await _tmdb.GetDetailsAsync(item.TmdbId, item.MediaType, ct);
        if (details is null)
            return false;

        var runtime = Math.Max(0, details.Runtime ?? 0);
        await _watchlist.UpdateFactsAsync(item.Id, runtime, details.VoteAverage, ct);
        return runtime > 0 || (item.VoteAverage is null && details.VoteAverage is not null);
    }
}

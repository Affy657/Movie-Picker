using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class BackfillEventStartAtMigration : IDataMigration
{
    private const int BatchSize = 200;

    private readonly IEventRepository _events;
    private readonly ILogger<BackfillEventStartAtMigration> _logger;

    public BackfillEventStartAtMigration(IEventRepository events, ILogger<BackfillEventStartAtMigration> logger)
    {
        _events = events;
        _logger = logger;
    }

    public string Id => "2026-09-15-004-backfill-event-start-at";

    public async Task<long> ExecuteAsync(CancellationToken ct = default)
    {
        var outcome = await BackfillSteps.RunBatchesAsync<Event>(
            _events.ListMissingStartAtAsync,
            evt => evt.Id,
            async (evt, token) =>
            {
                await _events.UpdateAsync(evt, token);
                return true;
            },
            (evt, ex) => _logger.LogWarning(ex, "Start time not backfilled for movie night {EventId}", evt.Id),
            BatchSize,
            ct);

        return outcome.Completed(Id);
    }
}

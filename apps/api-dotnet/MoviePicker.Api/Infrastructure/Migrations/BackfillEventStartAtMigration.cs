using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class BackfillEventStartAtMigration : IDataMigration
{
    private const int BatchSize = 200;

    private readonly IEventRepository _events;

    public BackfillEventStartAtMigration(IEventRepository events)
    {
        _events = events;
    }

    public string Id => "2026-09-15-004-backfill-event-start-at";

    public Task<long> ExecuteAsync(CancellationToken ct = default) =>
        BackfillSteps.RunBatchesAsync<Event>(
            _events.ListMissingStartAtAsync,
            evt => evt.Id,
            async (evt, token) =>
            {
                await _events.UpdateAsync(evt, token);
                return true;
            },
            BatchSize,
            ct);
}

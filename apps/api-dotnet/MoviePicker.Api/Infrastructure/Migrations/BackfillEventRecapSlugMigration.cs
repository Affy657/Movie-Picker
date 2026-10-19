using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Services;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class BackfillEventRecapSlugMigration : IDataMigration
{
    private const int BatchSize = 200;

    private readonly IEventRepository _events;
    private readonly ILogger<BackfillEventRecapSlugMigration> _logger;

    public BackfillEventRecapSlugMigration(IEventRepository events, ILogger<BackfillEventRecapSlugMigration> logger)
    {
        _events = events;
        _logger = logger;
    }

    public string Id => "2026-10-14-001-backfill-event-recap-slug";

    public async Task<long> ExecuteAsync(CancellationToken ct = default)
    {
        var outcome = await BackfillSteps.RunBatchesAsync<Event>(
            _events.ListMissingRecapSlugAsync,
            evt => evt.Id,
            async (evt, token) =>
            {
                await _events.UpdateAsync(evt with { RecapSlug = SlugGenerator.NewSlug() }, token);
                return true;
            },
            (evt, ex) => _logger.LogWarning(ex, "Recap link not backfilled for movie night {EventId}", evt.Id),
            BatchSize,
            ct);

        return outcome.Completed(Id);
    }
}

using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryDatabaseHealthProbe : IDatabaseHealthProbe
{
    public Task<DatabaseProbeResult> CheckAsync(CancellationToken ct = default)
        => Task.FromResult(new DatabaseProbeResult(DatabaseProbeStatus.NotApplicable, 0));
}

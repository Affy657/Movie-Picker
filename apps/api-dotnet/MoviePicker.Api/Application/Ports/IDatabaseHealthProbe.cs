namespace MoviePicker.Api.Application.Ports;

public enum DatabaseProbeStatus
{
    Healthy,
    Unavailable,
    NotApplicable
}

public sealed record DatabaseProbeResult(DatabaseProbeStatus Status, long DurationMs);

public interface IDatabaseHealthProbe
{
    Task<DatabaseProbeResult> CheckAsync(CancellationToken ct = default);
}

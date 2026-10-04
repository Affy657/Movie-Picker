namespace MoviePicker.Api.Application.Ports;

public interface IMigrationHistoryRepository
{
    Task<bool> IsAppliedAsync(string migrationId, CancellationToken ct = default);

    Task MarkAppliedAsync(
        string migrationId,
        long affectedCount,
        DateTimeOffset appliedAt,
        CancellationToken ct = default);

    Task<bool> TryAcquireLeaseAsync(
        string migrationId,
        string holder,
        DateTimeOffset now,
        TimeSpan duration,
        CancellationToken ct = default);

    Task ReleaseLeaseAsync(string migrationId, string holder, CancellationToken ct = default);
}

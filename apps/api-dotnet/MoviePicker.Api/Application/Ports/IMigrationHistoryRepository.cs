namespace MoviePicker.Api.Application.Ports;

public interface IMigrationHistoryRepository
{
    Task<bool> IsAppliedAsync(string migrationId, CancellationToken ct = default);

    Task MarkAppliedAsync(
        string migrationId,
        long affectedCount,
        DateTimeOffset appliedAt,
        CancellationToken ct = default);
}

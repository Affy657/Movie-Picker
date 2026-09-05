using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryMigrationHistoryRepository : IMigrationHistoryRepository
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> _applied = new();

    public Task<bool> IsAppliedAsync(string migrationId, CancellationToken ct = default) =>
        Task.FromResult(_applied.ContainsKey(migrationId));

    public Task MarkAppliedAsync(
        string migrationId,
        long affectedCount,
        DateTimeOffset appliedAt,
        CancellationToken ct = default)
    {
        _applied.TryAdd(migrationId, appliedAt);
        return Task.CompletedTask;
    }
}

using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryMigrationHistoryRepository : IMigrationHistoryRepository
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> _applied = new();
    private readonly Dictionary<string, (string Holder, DateTimeOffset ExpiresAt)> _leases = new(StringComparer.Ordinal);
    private readonly object _leaseGate = new();

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

    public Task<bool> TryAcquireLeaseAsync(
        string migrationId,
        string holder,
        DateTimeOffset now,
        TimeSpan duration,
        CancellationToken ct = default)
    {
        lock (_leaseGate)
        {
            if (_leases.TryGetValue(migrationId, out var lease) && lease.Holder != holder && lease.ExpiresAt > now)
                return Task.FromResult(false);

            _leases[migrationId] = (holder, now + duration);
            return Task.FromResult(true);
        }
    }

    public Task ReleaseLeaseAsync(string migrationId, string holder, CancellationToken ct = default)
    {
        lock (_leaseGate)
        {
            if (_leases.TryGetValue(migrationId, out var lease) && lease.Holder == holder)
                _leases.Remove(migrationId);
        }

        return Task.CompletedTask;
    }
}

using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryKnownDeviceRepository : IKnownDeviceRepository
{
    private readonly ConcurrentDictionary<string, KnownDevice> _byId = new();
    private readonly Lock _gate = new();

    public ICollection<KnownDevice> All => _byId.Values;

    public Task<KnownDevice?> FindAsync(string userId, string tokenHash, DateTimeOffset now, CancellationToken ct = default) =>
        Task.FromResult(_byId.Values.FirstOrDefault(d => d.UserId == userId && d.TokenHash == tokenHash && d.ForgottenAt > now));

    public Task<bool> AnyForUserAsync(string userId, DateTimeOffset now, CancellationToken ct = default) =>
        Task.FromResult(_byId.Values.Any(d => d.UserId == userId && d.ForgottenAt > now));

    public Task<KnownDevice?> TryAddAsync(KnownDevice device, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var existing = _byId.Values.FirstOrDefault(d => d.UserId == device.UserId && d.TokenHash == device.TokenHash);
            if (existing is not null && existing.ForgottenAt > device.FirstSeenAt)
                return Task.FromResult<KnownDevice?>(null);
            var added = device with { Id = existing?.Id ?? Guid.NewGuid().ToString("N") };
            _byId[added.Id] = added;
            return Task.FromResult<KnownDevice?>(added);
        }
    }

    public Task MarkSeenAsync(string deviceId, DateTimeOffset seenAt, CancellationToken ct = default)
    {
        if (_byId.TryGetValue(deviceId, out var device))
            _byId[deviceId] = device with { LastSeenAt = seenAt };
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<KnownDevice>> ListByUserIdAsync(string userId, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<KnownDevice>>(_byId.Values.Where(d => d.UserId == userId).OrderBy(d => d.FirstSeenAt).ToList());

    public Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        long removed = 0;
        foreach (var device in _byId.Values.Where(d => d.UserId == userId).ToList())
        {
            if (_byId.TryRemove(device.Id, out _))
                removed++;
        }
        return Task.FromResult(removed);
    }
}

using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryPushDedupRepository : IPushDedupRepository
{
    private readonly ConcurrentDictionary<string, byte> _claimed = new();

    public Task<bool> TryClaimAsync(string userId, UserNotificationType type, string eventId, CancellationToken ct = default)
    {
        var key = $"{userId}|{(int)type}|{eventId}";
        var claimed = _claimed.TryAdd(key, 0);
        return Task.FromResult(claimed);
    }
}

using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryPushSubscriptionRepository : IPushSubscriptionRepository
{
    private readonly ConcurrentDictionary<string, PushSubscription> _store = new();

    public Task UpsertAsync(PushSubscription subscription, CancellationToken ct = default)
    {
        var key = $"{subscription.UserId}|{subscription.Endpoint}";
        _store[key] = subscription with { Id = key };
        return Task.CompletedTask;
    }

    public Task DeleteByEndpointAsync(string userId, string endpoint, CancellationToken ct = default)
    {
        var key = $"{userId}|{endpoint}";
        _store.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<PushSubscription>> ListByUserIdAsync(string userId, CancellationToken ct = default)
    {
        IReadOnlyList<PushSubscription> result = _store.Values
            .Where(s => s.UserId == userId)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<PushSubscription>> ListByUserIdsAsync(IReadOnlyCollection<string> userIds, CancellationToken ct = default)
    {
        var set = new HashSet<string>(userIds);
        IReadOnlyList<PushSubscription> result = _store.Values
            .Where(s => set.Contains(s.UserId))
            .ToList();
        return Task.FromResult(result);
    }

    public Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        long count = 0;
        foreach (var key in _store.Keys.ToList())
        {
            if (_store.TryGetValue(key, out var s) && s.UserId == userId && _store.TryRemove(key, out _))
                count++;
        }

        return Task.FromResult(count);
    }
}

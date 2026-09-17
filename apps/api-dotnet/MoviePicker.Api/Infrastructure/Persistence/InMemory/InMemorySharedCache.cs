using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemorySharedCache : ISharedCache
{
    private readonly ConcurrentDictionary<string, (object? Value, DateTimeOffset ExpiresAt)> _entries = new();

    public Task<SharedCacheEntry<T>?> TryGetAsync<T>(string key, CancellationToken ct = default)
    {
        if (!_entries.TryGetValue(key, out var entry) || entry.ExpiresAt <= DateTimeOffset.UtcNow)
            return Task.FromResult<SharedCacheEntry<T>?>(null);
        return Task.FromResult<SharedCacheEntry<T>?>(
            entry.Value is T value ? new SharedCacheEntry<T>(value, entry.ExpiresAt) : null);
    }

    public Task<IReadOnlyDictionary<string, SharedCacheEntry<T>>> TryGetManyAsync<T>(
        IReadOnlyCollection<string> keys,
        CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var found = new Dictionary<string, SharedCacheEntry<T>>();
        foreach (var key in keys)
        {
            if (_entries.TryGetValue(key, out var entry) && entry.ExpiresAt > now && entry.Value is T value)
                found[key] = new SharedCacheEntry<T>(value, entry.ExpiresAt);
        }
        return Task.FromResult<IReadOnlyDictionary<string, SharedCacheEntry<T>>>(found);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    {
        _entries[key] = (value, DateTimeOffset.UtcNow.Add(ttl));
        return Task.CompletedTask;
    }
}

using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryRateLimitCounterStore : IRateLimitCounterStore
{
    private readonly ConcurrentDictionary<string, Counter> _counters = new();

    public Task<long> IncrementAsync(string key, DateTimeOffset expiresAt, CancellationToken ct = default)
    {
        PurgeExpired(expiresAt);
        var counter = _counters.GetOrAdd(key, _ => new Counter(expiresAt));
        return Task.FromResult(counter.Increment());
    }

    private void PurgeExpired(DateTimeOffset now)
    {
        foreach (var entry in _counters)
        {
            if (entry.Value.ExpiresAt < now)
                _counters.TryRemove(entry.Key, out _);
        }
    }

    private sealed class Counter
    {
        private long _value;

        public Counter(DateTimeOffset expiresAt) => ExpiresAt = expiresAt;

        public DateTimeOffset ExpiresAt { get; }

        public long Increment() => Interlocked.Increment(ref _value);
    }
}

using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryRateLimitCounterStore : IRateLimitCounterStore
{
    private readonly ConcurrentDictionary<string, Counter> _counters = new();
    private readonly TimeProvider _clock;

    public InMemoryRateLimitCounterStore(TimeProvider? clock = null)
    {
        _clock = clock ?? TimeProvider.System;
    }

    public Task<long> IncrementAsync(string key, DateTimeOffset expiresAt, CancellationToken ct = default)
    {
        PurgeExpired(_clock.GetUtcNow());
        var counter = _counters.GetOrAdd(key, _ => new Counter(expiresAt));
        return Task.FromResult(counter.Increment());
    }

    public Task DecrementAsync(string key, CancellationToken ct = default)
    {
        if (_counters.TryGetValue(key, out var counter))
            counter.Decrement();
        return Task.CompletedTask;
    }

    private void PurgeExpired(DateTimeOffset now)
    {
        foreach (var entry in _counters)
        {
            if (entry.Value.ExpiresAt <= now)
                _counters.TryRemove(entry);
        }
    }

    private sealed class Counter
    {
        private long _value;

        public Counter(DateTimeOffset expiresAt) => ExpiresAt = expiresAt;

        public DateTimeOffset ExpiresAt { get; }

        public long Increment() => Interlocked.Increment(ref _value);

        public void Decrement()
        {
            if (Interlocked.Decrement(ref _value) < 0)
                Interlocked.Increment(ref _value);
        }
    }
}

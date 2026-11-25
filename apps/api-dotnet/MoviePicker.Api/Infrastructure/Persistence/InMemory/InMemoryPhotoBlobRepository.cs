using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public abstract class InMemoryPhotoBlobRepository(TimeProvider? clock) : IPhotoBlobRepository
{
    private readonly ConcurrentDictionary<string, Entry> _byKey = new(StringComparer.Ordinal);
    private readonly TimeProvider _clock = clock ?? TimeProvider.System;

    public Task SaveAsync(StoredPhoto photo, CancellationToken ct = default)
    {
        _byKey[photo.Key] = new Entry(photo, null);
        return Task.CompletedTask;
    }

    public Task<StoredPhoto?> GetByKeyAsync(string key, CancellationToken ct = default)
    {
        PurgeExpired();
        return Task.FromResult(_byKey.TryGetValue(key, out var entry) ? entry.Photo : null);
    }

    public Task<long> EstimatedCountAsync(CancellationToken ct = default)
    {
        PurgeExpired();
        return Task.FromResult((long)_byKey.Count);
    }

    public Task DeleteAsync(string key, CancellationToken ct = default)
    {
        _byKey.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task ScheduleDeletionAsync(string key, DateTimeOffset deleteAt, CancellationToken ct = default)
    {
        if (_byKey.TryGetValue(key, out var entry))
            _byKey.TryUpdate(key, entry with { DeleteAt = deleteAt }, entry);
        return Task.CompletedTask;
    }

    public Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        long deleted = 0;
        foreach (var entry in _byKey)
        {
            if (entry.Value.Photo.UserId == userId && _byKey.TryRemove(entry.Key, out _))
                deleted++;
        }
        return Task.FromResult(deleted);
    }

    private void PurgeExpired()
    {
        var now = _clock.GetUtcNow();
        foreach (var entry in _byKey)
        {
            if (entry.Value.DeleteAt is { } deleteAt && deleteAt <= now)
                _byKey.TryRemove(entry);
        }
    }

    private sealed record Entry(StoredPhoto Photo, DateTimeOffset? DeleteAt);
}

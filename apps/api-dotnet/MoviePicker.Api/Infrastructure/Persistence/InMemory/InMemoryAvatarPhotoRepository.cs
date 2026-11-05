using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryAvatarPhotoRepository : IAvatarPhotoRepository
{
    private readonly ConcurrentDictionary<string, StoredAvatarPhoto> _byKey = new(StringComparer.Ordinal);

    public Task SaveAsync(StoredAvatarPhoto photo, CancellationToken ct = default)
    {
        _byKey[photo.Key] = photo;
        return Task.CompletedTask;
    }

    public Task<StoredAvatarPhoto?> GetByKeyAsync(string key, CancellationToken ct = default) =>
        Task.FromResult(_byKey.TryGetValue(key, out var photo) ? photo : null);

    public Task DeleteAsync(string key, CancellationToken ct = default)
    {
        _byKey.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        long deleted = 0;
        foreach (var entry in _byKey)
        {
            if (entry.Value.UserId == userId && _byKey.TryRemove(entry.Key, out _))
                deleted++;
        }
        return Task.FromResult(deleted);
    }
}

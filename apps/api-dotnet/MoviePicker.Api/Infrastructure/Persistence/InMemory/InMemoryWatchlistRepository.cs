using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryWatchlistRepository : IWatchlistRepository
{
    private readonly ConcurrentDictionary<string, WatchlistItem> _store = new();

    private static string Key(string userId, int tmdbId, MovieMediaType mediaType) =>
        $"{userId}|{tmdbId}|{(mediaType == MovieMediaType.Tv ? "tv" : "movie")}";

    public Task<IReadOnlyList<WatchlistItem>> ListByUserIdAsync(string userId, int limit = 500, CancellationToken ct = default)
    {
        IReadOnlyList<WatchlistItem> result = _store.Values
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<WatchlistItem?> GetOneAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        _store.TryGetValue(Key(userId, tmdbId, mediaType), out var item);
        return Task.FromResult(item);
    }

    public Task<bool> AddAsync(WatchlistItem item, CancellationToken ct = default)
    {
        var key = Key(item.UserId, item.TmdbId, item.MediaType);
        var stored = item with
        {
            Id = string.IsNullOrEmpty(item.Id) ? key : item.Id,
            CreatedAt = item.CreatedAt == default ? DateTimeOffset.UtcNow : item.CreatedAt
        };
        var added = _store.TryAdd(key, stored);
        return Task.FromResult(added);
    }

    public Task<bool> RemoveAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        var removed = _store.TryRemove(Key(userId, tmdbId, mediaType), out _);
        return Task.FromResult(removed);
    }

    public Task<long> RemoveForUsersAsync(IReadOnlyCollection<string> userIds, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        long count = 0;
        foreach (var userId in userIds)
        {
            if (_store.TryRemove(Key(userId, tmdbId, mediaType), out _))
                count++;
        }

        return Task.FromResult(count);
    }

    public Task<long> DeleteAllForUserAsync(string userId, CancellationToken ct = default)
    {
        long count = 0;
        foreach (var kv in _store)
        {
            if (kv.Value.UserId == userId && _store.TryRemove(kv.Key, out _))
                count++;
        }

        return Task.FromResult(count);
    }
}

using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryFollowRepository : IFollowRepository
{
    private readonly ConcurrentDictionary<string, (string FollowerId, string FolloweeId, DateTime CreatedAt)> _store = new();

    public Task<bool> FollowAsync(string followerId, string followeeId, CancellationToken ct = default)
    {
        var key = $"{followerId}|{followeeId}";
        var added = _store.TryAdd(key, (followerId, followeeId, DateTime.UtcNow));
        return Task.FromResult(added);
    }

    public Task UnfollowAsync(string followerId, string followeeId, CancellationToken ct = default)
    {
        _store.TryRemove($"{followerId}|{followeeId}", out _);
        return Task.CompletedTask;
    }

    public Task<bool> IsFollowingAsync(string followerId, string followeeId, CancellationToken ct = default)
    {
        return Task.FromResult(_store.ContainsKey($"{followerId}|{followeeId}"));
    }

    public Task<IReadOnlyList<string>> GetFollowingIdsAsync(string userId, int limit = 500, CancellationToken ct = default)
    {
        IReadOnlyList<string> result = _store.Values
            .Where(x => x.FollowerId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .Select(x => x.FolloweeId)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<string>> GetFollowerIdsAsync(string userId, int limit = 500, CancellationToken ct = default)
    {
        IReadOnlyList<string> result = _store.Values
            .Where(x => x.FolloweeId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .Select(x => x.FollowerId)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<(int Following, int Followers)> GetCountsAsync(string userId, CancellationToken ct = default)
    {
        var following = _store.Values.Count(x => x.FollowerId == userId);
        var followers = _store.Values.Count(x => x.FolloweeId == userId);
        return Task.FromResult((following, followers));
    }

    public Task<long> DeleteAllForUserAsync(string userId, CancellationToken ct = default)
    {
        long count = 0;
        foreach (var kv in _store)
        {
            if ((kv.Value.FollowerId == userId || kv.Value.FolloweeId == userId) && _store.TryRemove(kv.Key, out _))
                count++;
        }

        return Task.FromResult(count);
    }
}

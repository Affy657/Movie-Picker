using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryUserNotificationRepository : IUserNotificationRepository
{
    private readonly ConcurrentDictionary<string, UserNotification> _store = new();

    public Task AddAsync(UserNotification notification, CancellationToken ct = default)
    {
        var id = Guid.NewGuid().ToString();
        _store[id] = notification with { Id = id };
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<UserNotification>> ListByUserIdAsync(
        string userId, int limit = 50, CancellationToken ct = default)
    {
        IReadOnlyList<UserNotification> result = _store.Values
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<int> GetUnreadCountAsync(string userId, CancellationToken ct = default)
    {
        var count = _store.Values.Count(n => n.UserId == userId && !n.IsRead);
        return Task.FromResult(count);
    }

    public Task MarkAllReadAsync(string userId, CancellationToken ct = default)
    {
        foreach (var key in _store.Keys.ToList())
        {
            if (_store.TryGetValue(key, out var n) && n.UserId == userId && !n.IsRead)
                _store[key] = n with { IsRead = true };
        }
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string userId, UserNotificationType type, string eventId, CancellationToken ct = default)
    {
        var exists = _store.Values.Any(n => n.UserId == userId && n.Type == type && n.EventId == eventId);
        return Task.FromResult(exists);
    }

    public Task<IReadOnlySet<string>> ListUserIdsByTypeAndEventAsync(UserNotificationType type, string eventId, CancellationToken ct = default)
    {
        IReadOnlySet<string> result = _store.Values
            .Where(n => n.Type == type && n.EventId == eventId)
            .Select(n => n.UserId)
            .ToHashSet();
        return Task.FromResult(result);
    }

    public Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        long count = 0;
        foreach (var key in _store.Keys.ToList())
        {
            if (_store.TryGetValue(key, out var n) && n.UserId == userId && _store.TryRemove(key, out _))
                count++;
        }

        return Task.FromResult(count);
    }
}

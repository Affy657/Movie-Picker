using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryNotificationDedupRepository : INotificationDedupRepository
{
    private readonly ConcurrentDictionary<string, byte> _claimed = new();

    public Task<bool> TryClaimAsync(
        string userId,
        UserNotificationType type,
        string eventId,
        NotificationDedupChannel channel = NotificationDedupChannel.Push,
        CancellationToken ct = default) =>
        Task.FromResult(_claimed.TryAdd(Key(userId, type, eventId, channel), 0));

    public Task ReleaseAsync(
        string userId,
        UserNotificationType type,
        string eventId,
        NotificationDedupChannel channel = NotificationDedupChannel.Push,
        CancellationToken ct = default)
    {
        _claimed.TryRemove(Key(userId, type, eventId, channel), out _);
        return Task.CompletedTask;
    }

    private static string Key(string userId, UserNotificationType type, string eventId, NotificationDedupChannel channel) =>
        $"{userId}|{(int)type}|{eventId}|{(int)channel}";
}

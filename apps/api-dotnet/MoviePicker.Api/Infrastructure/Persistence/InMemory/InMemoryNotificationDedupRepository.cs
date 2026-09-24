using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryNotificationDedupRepository : INotificationDedupRepository
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> _claimed = new();
    private readonly TimeProvider _clock;

    public InMemoryNotificationDedupRepository(TimeProvider? clock = null)
    {
        _clock = clock ?? TimeProvider.System;
    }

    public Task<bool> TryClaimAsync(
        string userId,
        UserNotificationType type,
        string eventId,
        NotificationDedupChannel channel = NotificationDedupChannel.Push,
        CancellationToken ct = default) =>
        Task.FromResult(_claimed.TryAdd(Key(userId, type, eventId, channel), _clock.GetUtcNow()));

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

    public Task<bool> WasClaimedSinceAsync(
        string userId,
        UserNotificationType type,
        string eventId,
        NotificationDedupChannel channel,
        DateTimeOffset since,
        CancellationToken ct = default) =>
        Task.FromResult(_claimed.TryGetValue(Key(userId, type, eventId, channel), out var claimedAt) && claimedAt >= since);

    private static string Key(string userId, UserNotificationType type, string eventId, NotificationDedupChannel channel) =>
        $"{userId}|{(int)type}|{eventId}|{(int)channel}";
}

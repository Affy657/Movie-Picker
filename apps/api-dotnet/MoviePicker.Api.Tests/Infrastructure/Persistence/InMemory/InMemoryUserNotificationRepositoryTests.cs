using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryUserNotificationRepositoryTests
{
    private readonly InMemoryUserNotificationRepository _repo = new();

    private static UserNotification Mk(
        string userId = "u1",
        UserNotificationType type = UserNotificationType.NewFollower,
        string? eventId = null,
        bool isRead = false,
        DateTimeOffset createdAt = default) => new()
        {
            UserId = userId,
            Type = type,
            EventId = eventId,
            IsRead = isRead,
            CreatedAt = createdAt == default ? DateTimeOffset.UtcNow : createdAt
        };

    [Fact]
    public async Task AddAsync_ThenListByUserId_OrdersByCreatedAtDesc()
    {
        await _repo.AddAsync(Mk(createdAt: DateTimeOffset.UtcNow.AddMinutes(-5)));
        await _repo.AddAsync(Mk(type: UserNotificationType.MovieAdded, createdAt: DateTimeOffset.UtcNow));

        var list = await _repo.ListByUserIdAsync("u1");

        Assert.Equal(2, list.Count);
        Assert.Equal(UserNotificationType.MovieAdded, list[0].Type);
    }

    [Fact]
    public async Task ListByUserIdAsync_RespectsLimit()
    {
        await _repo.AddAsync(Mk());
        await _repo.AddAsync(Mk());

        Assert.Single(await _repo.ListByUserIdAsync("u1", limit: 1));
    }

    [Fact]
    public async Task GetUnreadCountAsync_CountsOnlyUnread()
    {
        await _repo.AddAsync(Mk(isRead: false));
        await _repo.AddAsync(Mk(isRead: true));

        Assert.Equal(1, await _repo.GetUnreadCountAsync("u1"));
        Assert.Equal(0, await _repo.GetUnreadCountAsync("u2"));
    }

    [Fact]
    public async Task MarkAllReadAsync_MarksEverythingForUser()
    {
        await _repo.AddAsync(Mk(isRead: false));
        await _repo.AddAsync(Mk(isRead: false));

        await _repo.MarkAllReadAsync("u1");

        Assert.Equal(0, await _repo.GetUnreadCountAsync("u1"));
    }

    [Fact]
    public async Task ExistsAsync_MatchesUserTypeAndEvent()
    {
        await _repo.AddAsync(Mk(type: UserNotificationType.EventReminder1h, eventId: "evt1"));

        Assert.True(await _repo.ExistsAsync("u1", UserNotificationType.EventReminder1h, "evt1"));
        Assert.False(await _repo.ExistsAsync("u1", UserNotificationType.EventReminder1h, "evt2"));
        Assert.False(await _repo.ExistsAsync("u1", UserNotificationType.MovieAdded, "evt1"));
    }

    [Fact]
    public async Task ListUserIdsByTypeAndEventAsync_ReturnsDistinctUsers()
    {
        await _repo.AddAsync(Mk(userId: "u1", type: UserNotificationType.EventReminder24h, eventId: "evt1"));
        await _repo.AddAsync(Mk(userId: "u2", type: UserNotificationType.EventReminder24h, eventId: "evt1"));
        await _repo.AddAsync(Mk(userId: "u3", type: UserNotificationType.EventReminder24h, eventId: "evt2"));

        var ids = await _repo.ListUserIdsByTypeAndEventAsync(UserNotificationType.EventReminder24h, "evt1");

        Assert.Equal(2, ids.Count);
        Assert.Contains("u1", ids);
        Assert.Contains("u2", ids);
    }

    [Fact]
    public async Task DeleteByUserIdAsync_RemovesAllForUser()
    {
        await _repo.AddAsync(Mk(userId: "u1"));
        await _repo.AddAsync(Mk(userId: "u1"));
        await _repo.AddAsync(Mk(userId: "u2"));

        Assert.Equal(2L, await _repo.DeleteByUserIdAsync("u1"));
        Assert.Empty(await _repo.ListByUserIdAsync("u1"));
        Assert.Single(await _repo.ListByUserIdAsync("u2"));
    }

    [Fact]
    public async Task MarkReadAsync_OnlyMarksMatchingUserAndId()
    {
        await _repo.AddAsync(Mk(userId: "u1"));
        var notificationId = (await _repo.ListByUserIdAsync("u1")).Single().Id;

        await _repo.MarkReadAsync("someone-else", notificationId);
        Assert.Equal(1, await _repo.GetUnreadCountAsync("u1"));

        await _repo.MarkReadAsync("u1", notificationId);
        Assert.Equal(0, await _repo.GetUnreadCountAsync("u1"));
    }

    [Fact]
    public async Task DeleteByEventIdAsync_RemovesOnlyNotificationsForThatEvent()
    {
        await _repo.AddAsync(Mk(userId: "u1", eventId: "evt1"));
        await _repo.AddAsync(Mk(userId: "u2", eventId: "evt1"));
        await _repo.AddAsync(Mk(userId: "u1", eventId: "evt2"));
        await _repo.AddAsync(Mk(userId: "u1", eventId: null));

        Assert.Equal(2L, await _repo.DeleteByEventIdAsync("evt1"));
        Assert.Equal(2, (await _repo.ListByUserIdAsync("u1")).Count);
        Assert.Empty(await _repo.ListByUserIdAsync("u2"));
    }
}

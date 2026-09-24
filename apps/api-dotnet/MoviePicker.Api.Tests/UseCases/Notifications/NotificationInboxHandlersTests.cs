using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Notifications;

public sealed class GetInboxHandlerTests
{
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly GetInboxHandler _sut;

    public GetInboxHandlerTests()
    {
        _users.Setup(u => u.GetByHandleAsync("bob", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "bob-id", Handle = "bob", IsProfilePublic = true });
        _sut = new GetInboxHandler(_notifications.Object, _users.Object);
    }

    [Fact]
    public async Task HandleAsync_AnActorWithAPrivateProfile_KeepsTheirHandleOutOfTheInbox()
    {
        _users.Setup(u => u.GetByHandleAsync("hidden", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "hidden-id", Handle = "hidden", IsProfilePublic = false });
        _notifications.Setup(n => n.ListByUserIdAsync("u1", 31, 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new UserNotification { Id = "n1", UserId = "u1", Type = UserNotificationType.NewFollower, ActorHandle = "hidden", ActorDisplayName = "Hidden" },
                new UserNotification { Id = "n2", UserId = "u1", Type = UserNotificationType.ParticipantJoined, ActorHandle = "bob" },
                new UserNotification { Id = "n3", UserId = "u1", Type = UserNotificationType.MovieAdded, ActorHandle = "hidden" }
            ]);

        var result = await _sut.HandleAsync("u1", limit: null, offset: null);

        Assert.Equal([null, "bob", null], result.Items.Select(i => i.ActorHandle));
        Assert.Equal("Hidden", result.Items[0].ActorDisplayName);
        _users.Verify(u => u.GetByHandleAsync("hidden", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_MapsItemsAndCountsUnreadAcrossAllPages()
    {
        _notifications.Setup(n => n.ListByUserIdAsync("u1", 31, 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new UserNotification { Id = "n1", UserId = "u1", Type = UserNotificationType.NewFollower, ActorHandle = "bob", IsRead = false },
                new UserNotification { Id = "n2", UserId = "u1", Type = UserNotificationType.MovieAdded, IsRead = true }
            ]);
        _notifications.Setup(n => n.GetUnreadCountAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(9);

        var result = await _sut.HandleAsync("u1", limit: null, offset: null);

        Assert.Equal(2, result.Items.Count);
        Assert.Equal("newfollower", result.Items[0].Type);
        Assert.Equal("bob", result.Items[0].ActorHandle);
        Assert.Equal(9, result.UnreadCount);
        Assert.False(result.HasMore);
    }

    [Fact]
    public async Task HandleAsync_NoNotifications_ReturnsEmptyInbox()
    {
        _notifications.Setup(n => n.ListByUserIdAsync("u1", 31, 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _notifications.Setup(n => n.GetUnreadCountAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(0);

        var result = await _sut.HandleAsync("u1", limit: null, offset: null);

        Assert.Empty(result.Items);
        Assert.Equal(0, result.UnreadCount);
        Assert.False(result.HasMore);
    }

    [Fact]
    public async Task HandleAsync_MoreItemsThanPageSize_TrimsAndSetsHasMore()
    {
        var items = Enumerable.Range(0, 3)
            .Select(i => new UserNotification { Id = $"n{i}", UserId = "u1", Type = UserNotificationType.NewFollower })
            .ToList();
        _notifications.Setup(n => n.ListByUserIdAsync("u1", 3, 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync(items);
        _notifications.Setup(n => n.GetUnreadCountAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(0);

        var result = await _sut.HandleAsync("u1", limit: 2, offset: null);

        Assert.Equal(2, result.Items.Count);
        Assert.True(result.HasMore);
    }

    [Fact]
    public async Task HandleAsync_PassesOffsetThrough()
    {
        _notifications.Setup(n => n.ListByUserIdAsync("u1", 31, 30, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _notifications.Setup(n => n.GetUnreadCountAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(0);

        await _sut.HandleAsync("u1", limit: null, offset: 30);

        _notifications.Verify(n => n.ListByUserIdAsync("u1", 31, 30, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ClampsLimitToValidRange()
    {
        _notifications.Setup(n => n.ListByUserIdAsync("u1", 101, 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _notifications.Setup(n => n.GetUnreadCountAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(0);

        await _sut.HandleAsync("u1", limit: 500, offset: null);

        _notifications.Verify(n => n.ListByUserIdAsync("u1", 101, 0, It.IsAny<CancellationToken>()), Times.Once);
    }
}

public sealed class MarkAllReadHandlerTests
{
    [Fact]
    public async Task HandleAsync_DelegatesToRepository()
    {
        var notifications = new Mock<IUserNotificationRepository>();
        var sut = new MarkAllReadHandler(notifications.Object);

        await sut.HandleAsync("u1");

        notifications.Verify(n => n.MarkAllReadAsync("u1", It.IsAny<CancellationToken>()), Times.Once);
    }
}

public sealed class MarkOneReadHandlerTests
{
    [Fact]
    public async Task HandleAsync_DelegatesToRepository()
    {
        var notifications = new Mock<IUserNotificationRepository>();
        var sut = new MarkOneReadHandler(notifications.Object);

        await sut.HandleAsync("u1", "n1");

        notifications.Verify(n => n.MarkReadAsync("u1", "n1", It.IsAny<CancellationToken>()), Times.Once);
    }
}

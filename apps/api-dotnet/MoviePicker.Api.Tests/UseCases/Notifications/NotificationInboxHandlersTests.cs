using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Notifications;

public sealed class GetInboxHandlerTests
{
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly GetInboxHandler _sut;

    public GetInboxHandlerTests()
    {
        _sut = new GetInboxHandler(_notifications.Object);
    }

    [Fact]
    public async Task HandleAsync_MapsItemsAndCountsUnread()
    {
        _notifications.Setup(n => n.ListByUserIdAsync("u1", 50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new UserNotification { Id = "n1", UserId = "u1", Type = UserNotificationType.NewFollower, ActorHandle = "bob", IsRead = false },
                new UserNotification { Id = "n2", UserId = "u1", Type = UserNotificationType.MovieAdded, IsRead = true }
            ]);

        var result = await _sut.HandleAsync("u1");

        Assert.Equal(2, result.Items.Count);
        Assert.Equal(1, result.UnreadCount);
        Assert.Equal("newfollower", result.Items[0].Type);
        Assert.Equal("bob", result.Items[0].ActorHandle);
    }

    [Fact]
    public async Task HandleAsync_NoNotifications_ReturnsEmptyInbox()
    {
        _notifications.Setup(n => n.ListByUserIdAsync("u1", 50, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var result = await _sut.HandleAsync("u1");

        Assert.Empty(result.Items);
        Assert.Equal(0, result.UnreadCount);
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

using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Follow;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Follow;

public sealed class FollowUserHandlerTests
{
    private const string CurrentUserId = "me";

    private readonly Mock<IFollowRepository> _follows = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly Mock<IPushSubscriptionRepository> _pushSubs = new();
    private readonly Mock<IPushNotificationSender> _pushSender = new();
    private readonly FollowUserHandler _sut;

    public FollowUserHandlerTests()
    {
        _sut = new FollowUserHandler(
            _follows.Object,
            _users.Object,
            _notifications.Object,
            _pushSubs.Object,
            _pushSender.Object,
            TimeProvider.System);
    }

    private static User Target(
        string id = "target",
        bool isPublic = true,
        bool notifyOnNewFollower = true) => new()
        {
            Id = id,
            Handle = "alice",
            DisplayName = "Alice",
            IsProfilePublic = isPublic,
            NotificationPreferences = new Dictionary<UserNotificationType, bool>
            {
                [UserNotificationType.NewFollower] = notifyOnNewFollower
            }
        };

    [Fact]
    public async Task HandleAsync_TargetNotFound_Throws()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync(CurrentUserId, "alice"));
    }

    [Fact]
    public async Task HandleAsync_CannotFollowSelf_Throws()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Target(id: CurrentUserId));

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(CurrentUserId, "alice"));
    }

    [Fact]
    public async Task HandleAsync_PrivateProfile_Throws()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Target(isPublic: false));

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync(CurrentUserId, "alice"));
    }

    [Fact]
    public async Task HandleAsync_AlreadyFollowing_DoesNotNotify()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(Target());
        _follows.Setup(f => f.FollowAsync(CurrentUserId, "target", It.IsAny<CancellationToken>())).ReturnsAsync(false);

        await _sut.HandleAsync(CurrentUserId, "alice");

        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_FollowerMissing_DoesNotNotify()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(Target());
        _follows.Setup(f => f.FollowAsync(CurrentUserId, "target", It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _users.Setup(u => u.GetByIdAsync(CurrentUserId, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await _sut.HandleAsync(CurrentUserId, "alice");

        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NewFollow_AddsNotificationAndPushes()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(Target());
        _follows.Setup(f => f.FollowAsync(CurrentUserId, "target", It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _users.Setup(u => u.GetByIdAsync(CurrentUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = CurrentUserId, Handle = "bob", DisplayName = "Bob" });
        _pushSubs.Setup(p => p.ListByUserIdAsync("target", It.IsAny<CancellationToken>()))
            .ReturnsAsync([new PushSubscription { UserId = "target", Endpoint = "e1" }]);

        await _sut.HandleAsync(CurrentUserId, "alice");

        _notifications.Verify(n => n.AddAsync(
            It.Is<UserNotification>(x => x.UserId == "target" && x.Type == UserNotificationType.NewFollower && x.ActorHandle == "bob"),
            It.IsAny<CancellationToken>()), Times.Once);
        _pushSender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_NotifyDisabled_SkipsNotificationAndPush()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Target(notifyOnNewFollower: false));
        _follows.Setup(f => f.FollowAsync(CurrentUserId, "target", It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _users.Setup(u => u.GetByIdAsync(CurrentUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = CurrentUserId, Handle = "bob", DisplayName = "Bob" });

        await _sut.HandleAsync(CurrentUserId, "alice");

        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
        _pushSender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

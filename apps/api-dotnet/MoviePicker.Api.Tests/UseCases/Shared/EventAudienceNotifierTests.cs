using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Shared;

public sealed class EventAudienceNotifierTests
{
    private const UserNotificationType Type = UserNotificationType.MovieAdded;

    private static readonly Dictionary<UserNotificationType, bool> OptedIn = new() { [Type] = true };
    private static readonly Dictionary<UserNotificationType, bool> OptedOut = new() { [Type] = false };

    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IPushSubscriptionRepository> _subscriptions = new();
    private readonly Mock<IPushNotificationSender> _sender = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly EventAudienceNotifier _sut;

    private static readonly EventAudienceMessage Message = new(
        "evt1",
        new UserNotification { Type = Type, EventId = "evt1", EventTitle = "Soirée" },
        new PushMessage("Titre", "Corps"));

    public EventAudienceNotifierTests()
    {
        _subscriptions
            .Setup(r => r.ListByUserIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _sut = TestAudienceNotifier.Over(
            _participants.Object, _users.Object, _subscriptions.Object, _sender.Object, _notifications.Object);
    }

    private void HasParticipants(params string?[] userIds) =>
        _participants.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(userIds.Select((u, i) => new Participant { Id = $"p{i}", EventId = "evt1", Pseudo = $"P{i}", UserId = u }).ToList());

    private void HasUsers(params User[] users) =>
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(users.ToList());

    private void VerifyInbox(string userId, Times times) =>
        _notifications.Verify(
            n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == userId), It.IsAny<CancellationToken>()),
            times);

    [Fact]
    public async Task NotifyParticipantsAsync_SkipsTheActorAndTheAnonymousAndDeduplicates()
    {
        HasParticipants("actor", null, "", "u1", "u1");
        IReadOnlyCollection<string>? asked = null;
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback((IReadOnlyCollection<string> ids, CancellationToken _) => asked = ids)
            .ReturnsAsync([new User { Id = "u1", NotificationPreferences = OptedIn }]);

        await _sut.NotifyParticipantsAsync(Message, exceptUserId: "actor");

        Assert.Equal(["u1"], asked);
        VerifyInbox("u1", Times.Once());
    }

    [Fact]
    public async Task NotifyParticipantsAsync_NoOneLeft_ReadsNoUser()
    {
        HasParticipants("actor", null);

        await _sut.NotifyParticipantsAsync(Message, exceptUserId: "actor");

        _users.Verify(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task NotifyUsersAsync_DoesNotReadTheParticipantsAndStampsEachInboxEntry()
    {
        HasUsers(new User { Id = "u1", NotificationPreferences = OptedIn }, new User { Id = "u2", NotificationPreferences = OptedIn });
        var added = new List<UserNotification>();
        _notifications.Setup(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()))
            .Callback((UserNotification n, CancellationToken _) => added.Add(n))
            .Returns(Task.CompletedTask);

        await _sut.NotifyUsersAsync(["u1", "u2"], Message);

        _participants.Verify(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Equal(["u1", "u2"], added.Select(n => n.UserId).Order());
        Assert.All(added, n =>
        {
            Assert.Equal(Type, n.Type);
            Assert.Equal("Soirée", n.EventTitle);
            Assert.False(n.IsRead);
            Assert.NotEqual(default, n.CreatedAt);
        });
    }

    [Fact]
    public async Task NotifyUsersAsync_ReachesOnlyTheUsersWhoWantThisNotification()
    {
        HasUsers(new User { Id = "u1", NotificationPreferences = OptedIn }, new User { Id = "u2", NotificationPreferences = OptedOut });
        _subscriptions
            .Setup(r => r.ListByUserIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new PushSubscription { Id = "s1", UserId = "u1", Endpoint = "https://push/1", P256dh = "k", Auth = "a" },
                new PushSubscription { Id = "s2", UserId = "u2", Endpoint = "https://push/2", P256dh = "k", Auth = "a" }
            ]);

        await _sut.NotifyUsersAsync(["u1", "u2"], Message);

        _sender.Verify(s => s.SendAsync(It.Is<PushSubscription>(p => p.UserId == "u1"), Message.Push, It.IsAny<CancellationToken>()), Times.Once);
        _sender.Verify(s => s.SendAsync(It.Is<PushSubscription>(p => p.UserId == "u2"), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        VerifyInbox("u1", Times.Once());
        VerifyInbox("u2", Times.Never());
    }

    [Fact]
    public async Task NotifyUsersAsync_InboxWriteFailsForOneRecipient_StillReachesTheNextOnes()
    {
        HasUsers(
            new User { Id = "u1", NotificationPreferences = OptedIn },
            new User { Id = "u2", NotificationPreferences = OptedIn },
            new User { Id = "u3", NotificationPreferences = OptedIn });
        _notifications
            .Setup(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u2"), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        await _sut.NotifyUsersAsync(["u1", "u2", "u3"], Message);

        VerifyInbox("u1", Times.Once());
        VerifyInbox("u3", Times.Once());
    }

    [Fact]
    public async Task NotifyUsersAsync_SubscriptionLookupFails_StillWritesTheInboxes()
    {
        HasUsers(new User { Id = "u1", NotificationPreferences = OptedIn });
        _subscriptions
            .Setup(r => r.ListByUserIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        await _sut.NotifyUsersAsync(["u1"], Message);

        VerifyInbox("u1", Times.Once());
    }

    [Fact]
    public async Task NotifyParticipantsAsync_ParticipantLookupFails_NeverReachesTheCaller()
    {
        _participants.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        await _sut.NotifyParticipantsAsync(Message);

        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task NotifyUsersAsync_Cancelled_StopsAtTheFirstInboxWithoutThrowing()
    {
        HasUsers(new User { Id = "u1", NotificationPreferences = OptedIn }, new User { Id = "u2", NotificationPreferences = OptedIn });
        _notifications.Setup(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());

        await _sut.NotifyUsersAsync(["u1", "u2"], Message);

        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}

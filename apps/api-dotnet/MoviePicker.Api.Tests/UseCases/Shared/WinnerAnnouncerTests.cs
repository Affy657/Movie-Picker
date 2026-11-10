using System.Globalization;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Shared;

public sealed class WinnerAnnouncerTests
{
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IPushSubscriptionRepository> _pushSubRepo = new();
    private readonly Mock<IPushNotificationSender> _pushSender = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly WinnerAnnouncer _sut;

    private static readonly Event Soiree = new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2019-01-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = "ht1",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    public WinnerAnnouncerTests()
    {
        _participantRepo
            .Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _sut = new WinnerAnnouncer(Audience(), TimeProvider.System);
    }

    private void HasParticipants(params string[] userIds) =>
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(userIds.Select((u, i) => new Participant
            {
                Id = $"p{i}",
                EventId = "evt1",
                Pseudo = $"P{i}",
                UserId = u,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            }).ToList());

    private void Users(params User[] users) =>
        _userRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(users.ToList());

    private void Subscriptions(params string[] userIds) =>
        _pushSubRepo.Setup(r => r.ListByUserIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(userIds.Select((u, i) => new PushSubscription { Id = $"s{i}", UserId = u, Endpoint = $"https://push/{i}", P256dh = "k", Auth = "a" }).ToList());

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private EventAudienceNotifier Audience() => TestAudienceNotifier.Over(
        _participantRepo.Object, _userRepo.Object, _pushSubRepo.Object, _pushSender.Object, _notifications.Object);

    private WinnerAnnouncer AnnouncerAt(string utcNow) =>
        new(Audience(), new FixedClock(DateTimeOffset.Parse(utcNow, CultureInfo.InvariantCulture)));

    [Theory]
    [InlineData("2019-01-01", "2019-01-01T18:00:00Z", "Ce soir : « Matrix » pour « Soirée »")]
    [InlineData("2019-01-02", "2019-01-01T23:30:00Z", "Ce soir : « Matrix » pour « Soirée »")]
    [InlineData("2019-01-01", "2018-12-31T22:59:00Z", "Mardi 1 janvier : « Matrix » pour « Soirée »")]
    [InlineData("2019-01-12", "2019-01-01T18:00:00Z", "Samedi 12 janvier : « Matrix » pour « Soirée »")]
    [InlineData("2018-12-30", "2019-01-01T18:00:00Z", "Dimanche 30 décembre : « Matrix » pour « Soirée »")]
    [InlineData("pas-une-date", "2019-01-01T18:00:00Z", "« Matrix » pour « Soirée »")]
    public async Task AnnounceAsync_SaysTonightOnlyOnTheDayOfTheNightInParis(string nightDate, string utcNow, string expectedBody)
    {
        HasParticipants("u1");
        Users(new User { Id = "u1", NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.MoviePicked] = true } });
        Subscriptions("u1");

        await AnnouncerAt(utcNow).AnnounceAsync(Soiree with { Date = nightDate }, "Matrix", WinnerPickMethod.Wheel);

        _pushSender.Verify(
            s => s.SendAsync(It.IsAny<PushSubscription>(), It.Is<PushMessage>(m => m.Body == expectedBody), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task AnnounceAsync_NotifiableParticipant_SendsPushAndInbox()
    {
        HasParticipants("u1");
        Users(new User { Id = "u1", NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.MoviePicked] = true } });
        Subscriptions("u1");

        await _sut.AnnounceAsync(Soiree, "Winner", WinnerPickMethod.Wheel);

        _pushSender.Verify(
            s => s.SendAsync(It.Is<PushSubscription>(x => x.UserId == "u1"), It.Is<PushMessage>(m => m.Title.Contains("tiré au sort")), It.IsAny<CancellationToken>()),
            Times.Once);
        _notifications.Verify(
            n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u1" && u.Type == UserNotificationType.MoviePicked), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task AnnounceAsync_ManualPick_UsesManualTypeAndWording()
    {
        HasParticipants("u1");
        Users(new User { Id = "u1", NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.MoviePickedManually] = true } });
        Subscriptions("u1");

        await _sut.AnnounceAsync(Soiree, "Winner", WinnerPickMethod.Manual);

        _pushSender.Verify(
            s => s.SendAsync(It.IsAny<PushSubscription>(), It.Is<PushMessage>(m => m.Title.Contains("choisi par l'hôte")), It.IsAny<CancellationToken>()),
            Times.Once);
        _notifications.Verify(
            n => n.AddAsync(It.Is<UserNotification>(u => u.Type == UserNotificationType.MoviePickedManually), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task AnnounceAsync_ParticipantOptedOut_DoesNotNotify()
    {
        HasParticipants("u1");
        Users(new User { Id = "u1", NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.MoviePicked] = false } });

        await _sut.AnnounceAsync(Soiree, "Winner", WinnerPickMethod.Wheel);

        _pushSender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task AnnounceAsync_NoParticipants_CompletesWithoutNotifying()
    {
        await _sut.AnnounceAsync(Soiree, "Winner", WinnerPickMethod.Wheel);

        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task AnnounceAsync_InboxWriteFailsForOneRecipient_StillReachesTheNextOnes()
    {
        HasParticipants("u1", "u2", "u3");
        var opted = new Dictionary<UserNotificationType, bool> { [UserNotificationType.MoviePicked] = true };
        Users(
            new User { Id = "u1", NotificationPreferences = opted },
            new User { Id = "u2", NotificationPreferences = opted },
            new User { Id = "u3", NotificationPreferences = opted });
        Subscriptions();
        _notifications
            .Setup(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u1"), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        await _sut.AnnounceAsync(Soiree, "Winner", WinnerPickMethod.Wheel);

        _notifications.Verify(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u2"), It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u3"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AnnounceAsync_PushThrows_StillWritesTheInboxes()
    {
        HasParticipants("u1");
        Users(new User { Id = "u1", NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.MoviePicked] = true } });
        Subscriptions("u1");
        _pushSender
            .Setup(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        await _sut.AnnounceAsync(Soiree, "Winner", WinnerPickMethod.Wheel);

        _notifications.Verify(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u1"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AnnounceAsync_RepositoryThrows_SwallowsException()
    {
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        await _sut.AnnounceAsync(Soiree, "Winner", WinnerPickMethod.Manual);

        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

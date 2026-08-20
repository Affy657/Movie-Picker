using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LaunchWheel;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LaunchWheel;

public sealed class LaunchWheelHandlerNotificationTests
{
    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IVoteRepository> _voteRepo = new();
    private readonly Mock<IHostTokenAccessor> _hostToken = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly Mock<IPosterImageStore> _posterStore = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IPushSubscriptionRepository> _pushSubRepo = new();
    private readonly Mock<IPushNotificationSender> _pushSender = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly LaunchWheelHandler _sut;

    public LaunchWheelHandlerNotificationTests()
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "soiree",
            HostToken = "ht1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht1");
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);
        _movieRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new() { Id = "mov1", EventId = "evt1", ParticipantId = "p1", TmdbId = 1, Title = "Winner", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
            ]);
        _voteRepo.Setup(r => r.AggregateScoresByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, VoteScoreAggregate>());
        _posterStore.Setup(s => s.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? u) => u);

        _sut = new LaunchWheelHandler(
            _eventRepo.Object, _movieRepo.Object, _voteRepo.Object, _hostToken.Object,
            _currentUser.Object, _posterStore.Object, _participantRepo.Object, _userRepo.Object,
            _pushSubRepo.Object, _pushSender.Object, _notifications.Object,
            NullLogger<LaunchWheelHandler>.Instance);
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

    [Fact]
    public async Task HandleAsync_NotifiableParticipant_SendsPushAndInbox()
    {
        HasParticipants("u1");
        Users(new User { Id = "u1", NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.MoviePicked] = true } });
        Subscriptions("u1");

        await _sut.HandleAsync("evt1");

        _pushSender.Verify(
            s => s.SendAsync(It.Is<PushSubscription>(x => x.UserId == "u1"), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()),
            Times.Once);
        _notifications.Verify(
            n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u1" && u.Type == UserNotificationType.MoviePicked), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ParticipantOptedOut_DoesNotNotify()
    {
        HasParticipants("u1");
        Users(new User { Id = "u1", NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.MoviePicked] = false } });

        await _sut.HandleAsync("evt1");

        _pushSender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NoParticipants_CompletesWithoutNotifying()
    {
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("mov1", result.Winner.Id);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

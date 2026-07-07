using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.DeleteEvent;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.DeleteEvent;

public sealed class DeleteEventHandlerNotificationTests
{
    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IVoteRepository> _voteRepo = new();
    private readonly Mock<ISeenMarkRepository> _seenMarkRepo = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IPushSubscriptionRepository> _pushSubRepo = new();
    private readonly Mock<IPushNotificationSender> _pushSender = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly DeleteEventHandler _sut;

    public DeleteEventHandlerNotificationTests()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns("creator");
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event
            {
                Id = "evt1",
                Title = "Soirée",
                Date = "2030-01-01",
                Time = "20:00",
                Slug = "soiree",
                HostToken = "ht1",
                CreatorUserId = "creator",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        _eventRepo.Setup(r => r.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _voteRepo.Setup(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(0L);
        _seenMarkRepo.Setup(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(0L);
        _movieRepo.Setup(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(0L);
        _participantRepo.Setup(r => r.DeleteByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(0L);

        _sut = new DeleteEventHandler(
            _eventRepo.Object, _participantRepo.Object, _movieRepo.Object, _voteRepo.Object,
            _seenMarkRepo.Object, _currentUser.Object, _userRepo.Object, _pushSubRepo.Object,
            _pushSender.Object, _notifications.Object, NullLogger<DeleteEventHandler>.Instance);
    }

    private void Participants(params string[] userIds) =>
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

    [Fact]
    public async Task HandleAsync_NotifiableParticipant_SendsPushAndInbox()
    {
        Participants("u2");
        _userRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new() { Id = "u2", NotifyOnEventDeleted = true }]);
        _pushSubRepo.Setup(r => r.ListByUserIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new() { Id = "s1", UserId = "u2", Endpoint = "https://push/x", P256dh = "k", Auth = "a" }]);

        await _sut.HandleAsync("evt1");

        _pushSender.Verify(
            s => s.SendAsync(It.Is<PushSubscription>(x => x.UserId == "u2"), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()),
            Times.Once);
        _notifications.Verify(
            n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u2" && u.Type == UserNotificationType.EventDeleted), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_CreatorExcludedFromNotifications()
    {
        Participants("creator");

        await _sut.HandleAsync("evt1");

        _userRepo.Verify(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ParticipantOptedOut_DoesNotNotify()
    {
        Participants("u2");
        _userRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new() { Id = "u2", NotifyOnEventDeleted = false }]);

        await _sut.HandleAsync("evt1");

        _pushSender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

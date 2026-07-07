using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.JoinEvent;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.JoinEvent;

public sealed class JoinEventHandlerNotificationTests
{
    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IPushSubscriptionRepository> _pushSubRepo = new();
    private readonly Mock<IPushNotificationSender> _pushSender = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly JoinEventHandler _sut;

    public JoinEventHandlerNotificationTests()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event
            {
                Id = "evt1",
                Title = "Soirée",
                Date = "2030-01-01",
                Time = "20:00",
                Slug = "soiree",
                HostToken = "ht1",
                CreatorUserId = "host",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        _participantRepo.Setup(r => r.FindByEventAndUserIdAsync("evt1", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant?)null);
        _participantRepo.Setup(r => r.FindByEventAndPseudoAsync("evt1", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant?)null);
        _participantRepo.Setup(r => r.AddAsync(It.IsAny<Participant>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant p, CancellationToken _) => p with { Id = "pnew" });

        _sut = new JoinEventHandler(
            _eventRepo.Object, _participantRepo.Object, _userRepo.Object, _pushSubRepo.Object,
            _pushSender.Object, _notifications.Object, NullLogger<JoinEventHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_HostNotifiable_SendsPushAndInbox()
    {
        _userRepo.Setup(r => r.GetByIdAsync("host", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "host", NotifyOnParticipantJoined = true });
        _userRepo.Setup(r => r.GetByIdAsync("joiner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "joiner", DisplayName = "Joiner", Handle = "joiner" });
        _pushSubRepo.Setup(r => r.ListByUserIdAsync("host", It.IsAny<CancellationToken>()))
            .ReturnsAsync([new() { Id = "s1", UserId = "host", Endpoint = "https://push/x", P256dh = "k", Auth = "a" }]);

        var result = await _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Joiner" }, "joiner");

        Assert.True(result.IsNew);
        _pushSender.Verify(
            s => s.SendAsync(It.Is<PushSubscription>(x => x.UserId == "host"), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()),
            Times.Once);
        _notifications.Verify(
            n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "host" && u.Type == UserNotificationType.ParticipantJoined), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_HostOptedOut_DoesNotNotify()
    {
        _userRepo.Setup(r => r.GetByIdAsync("host", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "host", NotifyOnParticipantJoined = false });

        await _sut.HandleAsync("evt1", new JoinEventRequest { Pseudo = "Joiner" }, "joiner");

        _pushSender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NoCreatorUserId_DoesNotNotify()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt2", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Event
            {
                Id = "evt2",
                Title = "Soirée",
                Date = "2030-01-01",
                Time = "20:00",
                Slug = "s2",
                HostToken = "ht1",
                CreatorUserId = null,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        _participantRepo.Setup(r => r.FindByEventAndUserIdAsync("evt2", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant?)null);
        _participantRepo.Setup(r => r.FindByEventAndPseudoAsync("evt2", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Participant?)null);

        await _sut.HandleAsync("evt2", new JoinEventRequest { Pseudo = "Joiner" }, "joiner");

        _userRepo.Verify(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

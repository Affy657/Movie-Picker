using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventConfiguration;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventConfiguration;

public sealed class PatchEventConfigHandlerNotificationTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IHostTokenAccessor> _hostToken = new();
    private readonly Mock<ICurrentUserAccessor> _user = new();
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IPushSubscriptionRepository> _pushSubRepo = new();
    private readonly Mock<IPushNotificationSender> _pushSender = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly PatchEventConfigHandler _sut;

    public PatchEventConfigHandlerNotificationTests()
    {
        var evt = new Event
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
        };
        _events.Setup(r => r.GetByIdOrSlugAsync("soiree", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht1");

        _sut = new PatchEventConfigHandler(
            _events.Object,
            _participants.Object,
            _hostToken.Object,
            _user.Object,
            _userRepo.Object,
            _pushSubRepo.Object,
            _pushSender.Object,
            _notifications.Object,
            NullLogger<PatchEventConfigHandler>.Instance);
    }

    private void Participants(params string[] userIds) =>
        _participants.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
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
    public async Task HandleAsync_DateChangedWithConsent_NotifiesOtherParticipants()
    {
        Participants("u2");
        _userRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new() { Id = "u2", NotificationPreferences = new Dictionary<UserNotificationType, bool> { [UserNotificationType.EventDateChanged] = true } }]);
        _pushSubRepo.Setup(r => r.ListByUserIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new() { Id = "s1", UserId = "u2", Endpoint = "https://push/x", P256dh = "k", Auth = "a" }]);

        await _sut.HandleAsync("soiree", new PatchEventConfigRequest
        {
            Date = "2030-02-01",
            NotifyParticipantsOfDateChange = true
        });

        _pushSender.Verify(
            s => s.SendAsync(It.Is<PushSubscription>(x => x.UserId == "u2"), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()),
            Times.Once);
        _notifications.Verify(
            n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u2" && u.Type == UserNotificationType.EventDateChanged), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_DateChangedWithoutConsent_DoesNotNotify()
    {
        Participants("u2");

        await _sut.HandleAsync("soiree", new PatchEventConfigRequest
        {
            Date = "2030-02-01",
            NotifyParticipantsOfDateChange = false
        });

        _userRepo.Verify(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_DateUnchanged_DoesNotNotifyEvenWithConsent()
    {
        Participants("u2");

        await _sut.HandleAsync("soiree", new PatchEventConfigRequest
        {
            Date = "2030-01-01",
            Time = "20:00",
            NotifyParticipantsOfDateChange = true
        });

        _userRepo.Verify(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_DateChanged_ExcludesActingHostFromNotifications()
    {
        _user.Setup(u => u.GetUserId()).Returns("host");
        Participants("host");

        await _sut.HandleAsync("soiree", new PatchEventConfigRequest
        {
            Date = "2030-02-01",
            NotifyParticipantsOfDateChange = true
        });

        _userRepo.Verify(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

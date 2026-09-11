using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventConfiguration;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventConfiguration;

public sealed class PatchEventConfigHandlerRecurrenceTests
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

    public PatchEventConfigHandlerRecurrenceTests()
    {
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht");
        _user.Setup(u => u.GetUserId()).Returns((string?)null);
        _events
            .Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);
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

    private void GivenEvent(Event evt) =>
        _events.Setup(r => r.GetByIdOrSlugAsync("s", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

    private static Event Upcoming() => new()
    {
        Id = "evt1",
        Title = "S",
        Date = "2035-01-01",
        Time = "20:00",
        Slug = "s",
        HostToken = "ht",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task HandleAsync_HostSetsRecurrence_PersistsItAndReturnsIt()
    {
        GivenEvent(Upcoming());

        var response = await _sut.HandleAsync(
            "s",
            new PatchEventConfigRequest { Recurrence = RecurrenceFrequency.Weekly });

        Assert.Equal(RecurrenceFrequency.Weekly, response.Recurrence);
        _events.Verify(
            r => r.UpdateAsync(
                It.Is<Event>(e => e.Recurrence == RecurrenceFrequency.Weekly),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_HostClearsRecurrence_RemovesIt()
    {
        GivenEvent(Upcoming() with { Recurrence = RecurrenceFrequency.Monthly });

        var response = await _sut.HandleAsync("s", new PatchEventConfigRequest { ClearRecurrence = true });

        Assert.Null(response.Recurrence);
        _events.Verify(
            r => r.UpdateAsync(It.Is<Event>(e => e.Recurrence == null), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_UntouchedRecurrence_SurvivesAnUnrelatedConfigPatch()
    {
        GivenEvent(Upcoming() with { Recurrence = RecurrenceFrequency.Biweekly });

        var response = await _sut.HandleAsync("s", new PatchEventConfigRequest { Theme = "Horreur" });

        Assert.Equal(RecurrenceFrequency.Biweekly, response.Recurrence);
    }

    [Fact]
    public async Task HandleAsync_WheelAlreadyLaunched_StillLetsTheHostStopTheRecurrence()
    {
        GivenEvent(Upcoming() with { Recurrence = RecurrenceFrequency.Weekly, Winners = TestWinners.Won("movie-1") });

        var response = await _sut.HandleAsync("s", new PatchEventConfigRequest { ClearRecurrence = true });

        Assert.Null(response.Recurrence);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_StillLetsTheHostStopTheRecurrence()
    {
        GivenEvent(Upcoming() with
        {
            Recurrence = RecurrenceFrequency.Weekly,
            ClosedAt = DateTimeOffset.UtcNow
        });

        var response = await _sut.HandleAsync("s", new PatchEventConfigRequest { ClearRecurrence = true });

        Assert.Null(response.Recurrence);
    }

    [Fact]
    public async Task HandleAsync_NextOccurrenceAlreadyCreated_ThrowsConflict()
    {
        GivenEvent(Upcoming() with
        {
            Recurrence = RecurrenceFrequency.Weekly,
            NextOccurrenceEventId = "evt2"
        });

        await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { ClearRecurrence = true }));
    }

    [Fact]
    public async Task HandleAsync_NotHost_CannotTouchTheRecurrence()
    {
        GivenEvent(Upcoming());
        _hostToken.Setup(h => h.GetHostToken()).Returns((string?)null);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _sut.HandleAsync("s", new PatchEventConfigRequest { Recurrence = RecurrenceFrequency.Weekly }));
    }
}

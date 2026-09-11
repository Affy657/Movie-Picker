using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventConfiguration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.EventConfiguration;

public sealed class PatchEventConfigHandlerWinnerCountTests
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

    public PatchEventConfigHandlerWinnerCountTests()
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

    private static Event Upcoming(params string[] winners) => new()
    {
        Id = "evt1",
        Title = "S",
        Date = "2035-01-01",
        Time = "20:00",
        Slug = "s",
        HostToken = "ht",
        Winners = TestWinners.Won(winners),
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task HandleAsync_NoConfigYet_ReportsOneFilmToDraw()
    {
        GivenEvent(Upcoming());

        var response = await _sut.HandleAsync("s", new PatchEventConfigRequest());

        Assert.Equal(EventConfig.DefaultWinnerCount, response.WinnerCount);
        Assert.Equal(EventConfig.WinnerCountCap, response.WinnerCountMax);
    }

    [Fact]
    public async Task HandleAsync_HostRaisesTheCount_PersistsIt()
    {
        GivenEvent(Upcoming());

        var response = await _sut.HandleAsync("s", new PatchEventConfigRequest { WinnerCount = 3 });

        Assert.Equal(3, response.WinnerCount);
        _events.Verify(
            r => r.UpdateAsync(
                It.Is<Event>(e => e.Config!.WinnerCount == 3),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_CountBelowOne_Throws()
    {
        GivenEvent(Upcoming());

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync("s", new PatchEventConfigRequest { WinnerCount = 0 }));
    }

    [Fact]
    public async Task HandleAsync_CountAboveTheCap_Throws()
    {
        GivenEvent(Upcoming());

        await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync(
                "s",
                new PatchEventConfigRequest { WinnerCount = EventConfig.WinnerCountCap + 1 }));
    }

    [Fact]
    public async Task HandleAsync_CountBelowTheFilmsAlreadyDrawn_Throws()
    {
        GivenEvent(Upcoming("m1", "m2", "m3"));

        var ex = await Assert.ThrowsAsync<ConflictException>(
            () => _sut.HandleAsync("s", new PatchEventConfigRequest { WinnerCount = 2 }));

        Assert.Contains("3 films", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task HandleAsync_CountEqualToTheFilmsAlreadyDrawn_IsAccepted()
    {
        GivenEvent(Upcoming("m1", "m2"));

        var response = await _sut.HandleAsync("s", new PatchEventConfigRequest { WinnerCount = 2 });

        Assert.Equal(2, response.WinnerCount);
    }

    [Fact]
    public async Task HandleAsync_RaisingTheCountAfterADraw_IsAccepted()
    {
        GivenEvent(Upcoming("m1"));

        var response = await _sut.HandleAsync("s", new PatchEventConfigRequest { WinnerCount = 4 });

        Assert.Equal(4, response.WinnerCount);
        Assert.Equal(1, response.DrawnWinnerCount);
    }

    [Fact]
    public async Task HandleAsync_FinishedEvent_RefusesTheChange()
    {
        GivenEvent(Upcoming() with { ClosedAt = DateTimeOffset.UtcNow.AddDays(-1) });

        await Assert.ThrowsAsync<ConflictException>(
            () => _sut.HandleAsync("s", new PatchEventConfigRequest { WinnerCount = 3 }));
    }

    [Fact]
    public async Task HandleAsync_ThemeChangeAfterADraw_StillRefused()
    {
        GivenEvent(Upcoming("m1"));

        await Assert.ThrowsAsync<ConflictException>(
            () => _sut.HandleAsync("s", new PatchEventConfigRequest { Theme = "Horreur" }));
    }
}

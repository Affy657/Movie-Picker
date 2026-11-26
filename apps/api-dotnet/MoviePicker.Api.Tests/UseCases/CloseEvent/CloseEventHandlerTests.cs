using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.CloseEvent;
using MoviePicker.Api.Application.UseCases.FinishedEvents;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.CloseEvent;

public sealed class CloseEventHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<ICurrentUserAccessor> _currentUser;
    private readonly Mock<IFinishedEventWatchlistPass> _watchlistCleanup = new();
    private readonly Mock<IRecurringEventPass> _recurringEvents = new();
    private readonly CloseEventHandler _sut;

    private const string HostUserId = "host-user";

    private static Event ActiveEvent() => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = TestDates.Upcoming,
        Time = "20:00",
        Slug = "soiree",
        CreatorUserId = HostUserId,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    public CloseEventHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _currentUser = new Mock<ICurrentUserAccessor>();
        _currentUser.Setup(c => c.GetUserId()).Returns(HostUserId);
        _sut = new CloseEventHandler(
            _eventRepo.Object,
            _currentUser.Object,
            _watchlistCleanup.Object,
            _recurringEvents.Object,
            NullLogger<CloseEventHandler>.Instance,
            TimeProvider.System);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetBySlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad"));
        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_Anonymous_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
        Assert.Equal(ErrorCodes.HostOnly, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AnotherAccount_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUser.Setup(c => c.GetUserId()).Returns("someone-else");

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
        Assert.Equal(ErrorCodes.HostOnly, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AlreadyClosed_ReturnsMessageWithoutUpdating()
    {
        var now = DateTimeOffset.UtcNow;
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = TestDates.Upcoming, Time = "20:00", Slug = "soiree", CreatorUserId = HostUserId, ClosedAt = now, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Movie night already closed", result.Message);
        Assert.Equal(now, result.ClosedAt);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Success_UpdatesEventWithClosedAt()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        Event? captured = null;
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Movie night closed", result.Message);
        Assert.NotNull(captured);
        Assert.NotNull(captured.ClosedAt);
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    [Fact]
    public async Task HandleAsync_PendingNightWithADrawLeft_FinishesItKeepingTheDrawnFilm()
    {
        var threeHoursAfterTheStart = new DateTimeOffset(2026, 11, 14, 22, 0, 0, TimeSpan.Zero);
        var evt = ActiveEvent() with
        {
            Date = "2026-11-14",
            Time = "20:00",
            Config = new EventConfig { WinnerCount = 2 },
            Winners = TestWinners.Won("mov1")
        };
        Assert.Equal(EventLifecycle.Pending, evt.Lifecycle(threeHoursAfterTheStart));
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        Event? captured = null;
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => e);
        var sut = new CloseEventHandler(
            _eventRepo.Object,
            _currentUser.Object,
            _watchlistCleanup.Object,
            _recurringEvents.Object,
            NullLogger<CloseEventHandler>.Instance,
            new FixedClock(threeHoursAfterTheStart));

        await sut.HandleAsync("evt1");

        Assert.NotNull(captured);
        Assert.Equal(["mov1"], captured.GetWinnerMovieIds());
        Assert.Equal(EventLifecycle.Finished, captured.Lifecycle(threeHoursAfterTheStart));
        _watchlistCleanup.Verify(
            w => w.RunForEventAsync(It.Is<Event>(e => e.ClosedAt == threeHoursAfterTheStart), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    private void GivenHostClosing(Event evt)
    {
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);
    }

    [Fact]
    public async Task HandleAsync_Closing_HandsTheClosedEventToTheWatchlistCleanup()
    {
        GivenHostClosing(ActiveEvent() with { Winners = TestWinners.Won("m-win") });

        await _sut.HandleAsync("evt1");

        _watchlistCleanup.Verify(
            p => p.RunForEventAsync(
                It.Is<Event>(e => e.Id == "evt1" && e.ClosedAt != null && e.Winners.Count == 1),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WatchlistCleanupFails_StillClosesTheEvent()
    {
        GivenHostClosing(ActiveEvent() with { Winners = TestWinners.Won("m-win") });
        _watchlistCleanup.Setup(p => p.RunForEventAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Movie night closed", result.Message);
        Assert.NotNull(result.ClosedAt);
    }

    [Fact]
    public async Task HandleAsync_AlreadyClosed_DoesNotRunTheWatchlistCleanupAgain()
    {
        var closed = ActiveEvent() with { Winners = TestWinners.Won("m-win"), ClosedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetBySlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(closed);

        await _sut.HandleAsync("evt1");

        _watchlistCleanup.Verify(
            p => p.RunForEventAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}

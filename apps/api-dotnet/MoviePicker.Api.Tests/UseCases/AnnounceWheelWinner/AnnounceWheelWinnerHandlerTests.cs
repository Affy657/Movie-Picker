using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AnnounceWheelWinner;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.AnnounceWheelWinner;

public sealed class AnnounceWheelWinnerHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor = new();
    private readonly Mock<ICurrentUserAccessor> _currentUserAccessor = new();
    private readonly Mock<IWinnerAnnouncer> _winnerAnnouncer = new();
    private readonly List<Movie> _movies = [];
    private readonly AnnounceWheelWinnerHandler _sut;

    private static readonly DateTimeOffset PickedAt = DateTimeOffset.UtcNow.AddSeconds(-8);

    private static Event WheelEvent() => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-01-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = "ht1",
        Winners =
        [
            new EventWinner { MovieId = "mov1", Method = WinnerPickMethod.Wheel, PickedAt = PickedAt }
        ],
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Movie Winner() => new()
    {
        Id = "mov1",
        EventId = "evt1",
        ParticipantId = "p1",
        TmdbId = 1,
        Title = "Winner",
        Year = "2020",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    public AnnounceWheelWinnerHandlerTests()
    {
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns((string?)null);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);
        _movieRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                _movies.Where(m => ids.Contains(m.Id)).ToList());
        _sut = new AnnounceWheelWinnerHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _hostTokenAccessor.Object,
            _currentUserAccessor.Object,
            _winnerAnnouncer.Object,
            NullLogger<AnnounceWheelWinnerHandler>.Instance,
            TimeProvider.System);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad"));
    }

    [Fact]
    public async Task HandleAsync_NotHost_ThrowsForbiddenException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(WheelEvent());
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("autre");

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), It.IsAny<string>(), It.IsAny<WinnerPickMethod>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WheelWinnerNotYetAnnounced_AnnouncesAndStampsEvent()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(WheelEvent());
        _movies.Add(Winner());
        Event? captured = null;
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => e);

        await _sut.HandleAsync("evt1");

        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), "Winner", WinnerPickMethod.Wheel, It.IsAny<CancellationToken>()),
            Times.Once);
        Assert.NotNull(captured);
        Assert.NotNull(captured.WinnerAnnouncedAt);
        Assert.True(captured.WinnerAnnouncedAt >= PickedAt);
    }

    [Fact]
    public async Task HandleAsync_CalledTwice_AnnoncesOnlyOnce()
    {
        var announced = WheelEvent() with { WinnerAnnouncedAt = PickedAt.AddSeconds(8) };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(announced);
        _movies.Add(Winner());

        await _sut.HandleAsync("evt1");

        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), It.IsAny<string>(), It.IsAny<WinnerPickMethod>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_RelaunchAfterAnAnnouncedPick_AnnouncesTheNewWinner()
    {
        var relaunched = WheelEvent() with { WinnerAnnouncedAt = PickedAt.AddSeconds(-60) };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(relaunched);
        _movies.Add(Winner());

        await _sut.HandleAsync("evt1");

        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), "Winner", WinnerPickMethod.Wheel, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ManualPick_DoesNotAnnounceAgain()
    {
        var manual = WheelEvent() with
        {
            Winners =
            [
                new EventWinner
                {
                    MovieId = "mov1",
                    Method = WinnerPickMethod.Manual,
                    PickedAt = PickedAt
                }
            ]
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(manual);
        _movies.Add(Winner());

        await _sut.HandleAsync("evt1");

        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), It.IsAny<string>(), It.IsAny<WinnerPickMethod>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ManualPickAfterAnUnannouncedWheelPick_StillAnnouncesTheWheelPick()
    {
        var mixed = WheelEvent() with
        {
            Winners =
            [
                new EventWinner { MovieId = "mov1", Method = WinnerPickMethod.Wheel, PickedAt = PickedAt },
                new EventWinner { MovieId = "mov2", Method = WinnerPickMethod.Manual, PickedAt = PickedAt.AddSeconds(4) }
            ]
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(mixed);
        _movies.Add(Winner());
        _movies.Add(Winner() with { Id = "mov2", Title = "Manual" });

        await _sut.HandleAsync("evt1");

        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), "Winner", WinnerPickMethod.Wheel, It.IsAny<CancellationToken>()),
            Times.Once);
        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), "Manual", It.IsAny<WinnerPickMethod>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_TwoWheelPicksSinceTheLastAnnouncement_AnnouncesBothInPickOrderAndStampsOnce()
    {
        var twoPending = WheelEvent() with
        {
            WinnerAnnouncedAt = PickedAt.AddSeconds(-60),
            Winners =
            [
                new EventWinner { MovieId = "mov2", Method = WinnerPickMethod.Wheel, PickedAt = PickedAt.AddSeconds(4) },
                new EventWinner { MovieId = "mov1", Method = WinnerPickMethod.Wheel, PickedAt = PickedAt }
            ]
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(twoPending);
        _movies.Add(Winner());
        _movies.Add(Winner() with { Id = "mov2", Title = "Second" });
        var announced = new List<string>();
        _winnerAnnouncer
            .Setup(a => a.AnnounceAsync(It.IsAny<Event>(), It.IsAny<string>(), It.IsAny<WinnerPickMethod>(), It.IsAny<CancellationToken>()))
            .Callback<Event, string, WinnerPickMethod, CancellationToken>((_, title, _, _) => announced.Add(title))
            .Returns(Task.CompletedTask);

        await _sut.HandleAsync("evt1");

        Assert.Equal(["Winner", "Second"], announced);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_PendingPickWhoseMovieIsGone_NeitherAnnouncesNorStamps()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(WheelEvent());

        await _sut.HandleAsync("evt1");

        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), It.IsAny<string>(), It.IsAny<WinnerPickMethod>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NoWinnerYet_DoesNothing()
    {
        var noWinner = WheelEvent() with { Winners = [] };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(noWinner);

        await _sut.HandleAsync("evt1");

        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), It.IsAny<string>(), It.IsAny<WinnerPickMethod>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}

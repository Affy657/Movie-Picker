using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.CloseEvent;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.CloseEvent;

public sealed class CloseEventHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<IWatchlistRepository> _watchlistRepo;
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor;
    private readonly Mock<ICurrentUserAccessor> _currentUser;
    private readonly Mock<IRecurringEventPass> _recurringEvents = new();
    private readonly CloseEventHandler _sut;

    private static Event ActiveEvent(string hostToken = "ht1") => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-01-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = hostToken,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    public CloseEventHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _watchlistRepo = new Mock<IWatchlistRepository>();
        _hostTokenAccessor = new Mock<IHostTokenAccessor>();
        _currentUser = new Mock<ICurrentUserAccessor>();
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);
        _sut = new CloseEventHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _participantRepo.Object,
            _watchlistRepo.Object,
            _hostTokenAccessor.Object,
            _currentUser.Object,
            _recurringEvents.Object,
            NullLogger<CloseEventHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad"));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_NoHostToken_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("hôte", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_WrongHostToken_ThrowsForbiddenException()
    {
        var evt = ActiveEvent("real");
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("wrong");

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("hôte", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_AlreadyClosed_ReturnsMessageWithoutUpdating()
    {
        var now = DateTimeOffset.UtcNow;
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2030-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht1", ClosedAt = now, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Soirée déjà clôturée", result.Message);
        Assert.Equal(now, result.ClosedAt);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Success_UpdatesEventWithClosedAt()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        Event? captured = null;
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Soirée clôturée.", result.Message);
        Assert.NotNull(captured);
        Assert.NotNull(captured.ClosedAt);
    }

    [Fact]
    public async Task HandleAsync_CreatorWithoutHostToken_Succeeds()
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "soiree",
            HostToken = "ht1",
            CreatorUserId = "user-1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUser.Setup(c => c.GetUserId()).Returns("user-1");
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Soirée clôturée.", result.Message);
    }

    private void GivenHostClosing(Event evt)
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns(evt.HostToken);
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);
    }

    private static Event EventWithWinner() => ActiveEvent() with { WinnerMovieId = "m-win" };

    private static Movie Winner() => new()
    {
        Id = "m-win",
        EventId = "evt1",
        TmdbId = 550,
        MediaType = MovieMediaType.Movie,
        Title = "Fight Club"
    };

    [Fact]
    public async Task HandleAsync_NoWinner_NeverLooksAtWatchlists()
    {
        GivenHostClosing(ActiveEvent());

        await _sut.HandleAsync("evt1");

        _movieRepo.Verify(
            r => r.GetByIdAndEventIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WithWinner_RemovesItFromEveryRegisteredParticipantWatchlist()
    {
        GivenHostClosing(EventWithWinner());
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("m-win", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Winner());
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" },
                new Participant { Id = "p2", EventId = "evt1", Pseudo = "Invité" },
                new Participant { Id = "p3", EventId = "evt1", Pseudo = "Bob", UserId = "u2" },
                new Participant { Id = "p4", EventId = "evt1", Pseudo = "Alice bis", UserId = "u1" }
            ]);
        _watchlistRepo.Setup(r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Soirée clôturée.", result.Message);
        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(
                It.Is<IReadOnlyCollection<string>>(ids => ids.Count == 2 && ids.Contains("u1") && ids.Contains("u2")),
                550,
                MovieMediaType.Movie,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WinnerMovieGone_RemovesNothing()
    {
        GivenHostClosing(EventWithWinner());
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("m-win", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Movie?)null);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Soirée clôturée.", result.Message);
        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_OnlyGuestParticipants_RemovesNothing()
    {
        GivenHostClosing(EventWithWinner());
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("m-win", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Winner());
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Participant { Id = "p1", EventId = "evt1", Pseudo = "Invité" }]);

        await _sut.HandleAsync("evt1");

        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WatchlistCleanupFails_StillClosesTheEvent()
    {
        GivenHostClosing(EventWithWinner());
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("m-win", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Winner());
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" }]);
        _watchlistRepo.Setup(r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("base injoignable"));

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Soirée clôturée.", result.Message);
        Assert.NotNull(result.ClosedAt);
    }

    [Fact]
    public async Task HandleAsync_WinnerIsASeries_RemovesItWithTheRightMediaType()
    {
        GivenHostClosing(EventWithWinner());
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("m-win", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Winner() with { MediaType = MovieMediaType.Tv, TmdbId = 1396 });
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" }]);
        _watchlistRepo.Setup(r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        await _sut.HandleAsync("evt1");

        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), 1396, MovieMediaType.Tv, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_AlreadyClosedWithAWinner_DoesNotTouchWatchlistsAgain()
    {
        var closed = EventWithWinner() with { ClosedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(closed);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        await _sut.HandleAsync("evt1");

        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}

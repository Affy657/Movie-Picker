using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FinishedEvents;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.FinishedEvents;

public sealed class FinishedEventWatchlistPassTests
{
    private static readonly DateTimeOffset Now = new(2030, 6, 2, 12, 0, 0, TimeSpan.Zero);

    private sealed class FrozenClock : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FrozenClock(DateTimeOffset now) => _now = now;

        public override DateTimeOffset GetUtcNow() => _now;
    }

    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IWatchlistRepository> _watchlistRepo = new();
    private readonly List<Movie> _movies = [];
    private readonly FinishedEventWatchlistPass _sut;

    public FinishedEventWatchlistPassTests()
    {
        _eventRepo.Setup(r => r.MarkWatchlistCleanedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _movieRepo.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                _movies.Where(m => ids.Contains(m.Id)).ToList());
        _sut = new FinishedEventWatchlistPass(
            _eventRepo.Object,
            _movieRepo.Object,
            _participantRepo.Object,
            _watchlistRepo.Object,
            new FrozenClock(Now),
            NullLogger<FinishedEventWatchlistPass>.Instance);
    }

    private static Event FinishedWithWinner() => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-06-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = "ht1",
        Winners = TestWinners.Won("m-win"),
        CreatedAt = Now.AddDays(-3),
        UpdatedAt = Now.AddDays(-1)
    };

    private static Movie Winner() => new()
    {
        Id = "m-win",
        EventId = "evt1",
        TmdbId = 550,
        MediaType = MovieMediaType.Movie,
        Title = "Fight Club"
    };

    private void GivenWinnerAndParticipants(params Participant[] participants)
    {
        _movies.Add(Winner());
        _participantRepo.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(participants);
        _watchlistRepo.Setup(r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
    }

    private void VerifyNotStamped() =>
        _eventRepo.Verify(
            r => r.MarkWatchlistCleanedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);

    private void VerifyNoWatchlistTouched() =>
        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);

    [Fact]
    public async Task RunForEventAsync_FinishedWithWinner_RemovesItFromEveryRegisteredParticipantWatchlist()
    {
        GivenWinnerAndParticipants(
            new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" },
            new Participant { Id = "p2", EventId = "evt1", Pseudo = "Invité" },
            new Participant { Id = "p3", EventId = "evt1", Pseudo = "Bob", UserId = "u2" },
            new Participant { Id = "p4", EventId = "evt1", Pseudo = "Alice bis", UserId = "u1" });

        var cleaned = await _sut.RunForEventAsync(FinishedWithWinner());

        Assert.True(cleaned);
        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(
                It.Is<IReadOnlyCollection<string>>(ids => ids.Count == 2 && ids.Contains("u1") && ids.Contains("u2")),
                550,
                MovieMediaType.Movie,
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunForEventAsync_Cleaned_StampsTheEventSoItIsNeverCleanedTwice()
    {
        GivenWinnerAndParticipants(new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" });

        await _sut.RunForEventAsync(FinishedWithWinner());

        _eventRepo.Verify(r => r.MarkWatchlistCleanedAsync("evt1", Now, It.IsAny<CancellationToken>()), Times.Once);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunForEventAsync_AlreadyCleaned_DoesNothing()
    {
        var cleaned = await _sut.RunForEventAsync(FinishedWithWinner() with { WatchlistCleanedAt = Now.AddHours(-1) });

        Assert.False(cleaned);
        VerifyNoWatchlistTouched();
        VerifyNotStamped();
    }

    [Fact]
    public async Task RunForEventAsync_StillLive_WaitsForTheEventToFinish()
    {
        var live = FinishedWithWinner() with { Date = "2030-06-02", Time = "13:30" };

        var cleaned = await _sut.RunForEventAsync(live);

        Assert.False(cleaned);
        VerifyNoWatchlistTouched();
    }

    [Fact]
    public async Task RunForEventAsync_NoWinner_NeverLooksAtWatchlists()
    {
        var cleaned = await _sut.RunForEventAsync(FinishedWithWinner() with { Winners = [] });

        Assert.False(cleaned);
        _movieRepo.Verify(
            r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
        VerifyNoWatchlistTouched();
    }

    [Fact]
    public async Task RunForEventAsync_ClosedByTheHost_CountsAsFinishedWhateverTheDate()
    {
        GivenWinnerAndParticipants(new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" });
        var closedEarly = FinishedWithWinner() with { Date = "2030-06-02", Time = "23:00", ClosedAt = Now };

        var cleaned = await _sut.RunForEventAsync(closedEarly);

        Assert.True(cleaned);
    }

    [Fact]
    public async Task RunForEventAsync_WinnerMovieGone_RemovesNothingButStillStamps()
    {
        var cleaned = await _sut.RunForEventAsync(FinishedWithWinner());

        Assert.True(cleaned);
        VerifyNoWatchlistTouched();
        _eventRepo.Verify(r => r.MarkWatchlistCleanedAsync("evt1", Now, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RunForEventAsync_OnlyGuestParticipants_RemovesNothing()
    {
        GivenWinnerAndParticipants(new Participant { Id = "p1", EventId = "evt1", Pseudo = "Invité" });

        await _sut.RunForEventAsync(FinishedWithWinner());

        VerifyNoWatchlistTouched();
    }

    [Fact]
    public async Task RunForEventAsync_WatchlistRemovalFails_LeavesTheEventUnstampedForNextTime()
    {
        GivenWinnerAndParticipants(new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" });
        _watchlistRepo.Setup(r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("base injoignable"));

        var cleaned = await _sut.RunForEventAsync(FinishedWithWinner());

        Assert.False(cleaned);
        VerifyNotStamped();
    }

    [Fact]
    public async Task RunForEventAsync_WinnerIsASeries_RemovesItWithTheRightMediaType()
    {
        GivenWinnerAndParticipants(new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" });
        _movies.Clear();
        _movies.Add(Winner() with { MediaType = MovieMediaType.Tv, TmdbId = 1396 });

        await _sut.RunForEventAsync(FinishedWithWinner());

        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), 1396, MovieMediaType.Tv, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunForEventAsync_SeveralWinners_RemovesEachOfThem()
    {
        var evt = FinishedWithWinner() with { Winners = TestWinners.Won("m-win", "m-two") };
        GivenWinnerAndParticipants(new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" });
        _movies.Add(Winner() with { Id = "m-two", TmdbId = 603 });

        await _sut.RunForEventAsync(evt);

        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), 550, MovieMediaType.Movie, It.IsAny<CancellationToken>()),
            Times.Once);
        _watchlistRepo.Verify(
            r => r.RemoveForUsersAsync(It.IsAny<IReadOnlyCollection<string>>(), 603, MovieMediaType.Movie, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_SweepsTheEventsTheRepositoryReportsAsAwaitingCleanup()
    {
        GivenWinnerAndParticipants(new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" });
        _eventRepo
            .Setup(r => r.ListAwaitingWatchlistCleanupAsync(Now, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([FinishedWithWinner(), FinishedWithWinner() with { Id = "evt-live", Date = "2030-06-02", Time = "13:30" }]);

        var result = await _sut.RunAsync();

        Assert.Equal(new FinishedEventWatchlistPassResult(2, 1), result);
        _eventRepo.Verify(r => r.MarkWatchlistCleanedAsync("evt1", Now, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RunForEventsAsync_OnlyTouchesTheFinishedUncleanedEventsWithAWinner()
    {
        GivenWinnerAndParticipants(new Participant { Id = "p1", EventId = "evt1", Pseudo = "Alice", UserId = "u1" });
        var events = new[]
        {
            FinishedWithWinner(),
            FinishedWithWinner() with { Id = "evt-cleaned", WatchlistCleanedAt = Now.AddDays(-1) },
            FinishedWithWinner() with { Id = "evt-live", Date = "2030-06-02", Time = "13:30" },
            FinishedWithWinner() with { Id = "evt-no-winner", Winners = [] }
        };

        var cleaned = await _sut.RunForEventsAsync(events);

        Assert.Equal(1, cleaned);
        _eventRepo.Verify(r => r.MarkWatchlistCleanedAsync("evt1", Now, It.IsAny<CancellationToken>()), Times.Once);
        _eventRepo.Verify(
            r => r.MarkWatchlistCleanedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}

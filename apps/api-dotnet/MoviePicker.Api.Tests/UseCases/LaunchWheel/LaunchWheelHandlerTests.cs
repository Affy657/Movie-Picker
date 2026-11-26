using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LaunchWheel;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LaunchWheel;

public sealed class LaunchWheelHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IVoteRepository> _voteRepo;
    private readonly Mock<ICurrentUserAccessor> _currentUserAccessor;
    private readonly Mock<IPosterImageStore> _posterStore;
    private readonly LaunchWheelHandler _sut;

    private const string HostUserId = "host-user";

    private static Event ActiveEvent(string creatorUserId = HostUserId) => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = TestDates.Upcoming,
        Time = "20:00",
        Slug = "soiree",
        CreatorUserId = creatorUserId,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    public LaunchWheelHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _voteRepo = new Mock<IVoteRepository>();
        _currentUserAccessor = new Mock<ICurrentUserAccessor>();
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns(HostUserId);
        _voteRepo.Setup(r => r.AggregateScoresByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, VoteScoreAggregate>());
        _posterStore = new Mock<IPosterImageStore>();
        _posterStore.Setup(s => s.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? u) => u);
        _sut = new LaunchWheelHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _currentUserAccessor.Object,
            _posterStore.Object,
            NullLogger<LaunchWheelHandler>.Instance,
            TimeProvider.System);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad"));
        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_Anonymous_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns((string?)null);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
        Assert.Equal(ErrorCodes.HostOnly, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AnotherAccount_ThrowsForbiddenException()
    {
        var evt = ActiveEvent("real");
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
        Assert.Equal(ErrorCodes.HostOnly, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsBadRequestException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", CreatorUserId = HostUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1"));
        Assert.Equal(ErrorCodes.EventFinished, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_EventAlreadyClosed_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = TestDates.Upcoming, Time = "20:00", Slug = "soiree", CreatorUserId = HostUserId, ClosedAt = DateTimeOffset.UtcNow, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1"));
        Assert.Equal(ErrorCodes.EventFinished, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_NoMovies_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync([]);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1"));
        Assert.Equal(ErrorCodes.NoMovieProposed, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AllMoviesExcludedFromWheel_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "A", Year = "2020", ExcludedFromWheel = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p2", TmdbId = 2, Title = "B", Year = "2021", ExcludedFromWheel = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1"));
        Assert.Equal(ErrorCodes.AllMoviesExcluded, ex.Reason);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ExcludedMovieIsNeverPicked()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Excluded", Year = "2020", ExcludedFromWheel = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p2", TmdbId = 2, Title = "A", Year = "2021", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov3", EventId = evt.Id, ParticipantId = "p3", TmdbId = 3, Title = "B", Year = "2022", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        for (var i = 0; i < 30; i++)
        {
            var result = await _sut.HandleAsync("evt1");
            Assert.NotEqual("mov1", result.Winner.Id);
        }
    }

    [Fact]
    public async Task HandleAsync_SingleEligibleMovie_ReturnsDirectWinnerMessage()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Excluded", Year = "2020", ExcludedFromWheel = true, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p2", TmdbId = 2, Title = "Seul candidat", Year = "2021", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("mov2", result.Winner.Id);
        Assert.Contains("direct winner", result.Message);
    }

    [Fact]
    public async Task HandleAsync_AnonymousNight_DoesNotRevealWhoProposedTheWinner()
    {
        var evt = ActiveEvent() with { Config = new EventConfig { AnonymousProposals = true } };
        var movies = new List<Movie>
        {
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p2", TmdbId = 2, Title = "Seul candidat", Year = "2021", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("mov2", result.Winner.Id);
        Assert.Equal(string.Empty, result.Winner.ParticipantId);
    }

    [Fact]
    public async Task HandleAsync_Success_UpdatesEventWithWinnerAndReturnsResponse()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Winner", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        Event? captured = null;
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.NotNull(result.Winner);
        Assert.Equal("mov1", result.Winner.Id);
        Assert.Equal("Winner", result.Winner.Title);
        Assert.NotNull(captured);
        var winner = Assert.Single(captured.Winners);
        Assert.Equal("mov1", winner.MovieId);
        Assert.Equal(WinnerPickMethod.Wheel, winner.Method);
        Assert.Contains("direct winner", result.Message);
        Assert.Null(captured.WinnerAnnouncedAt);
    }

    [Fact]
    public async Task HandleAsync_Relaunch_DoesNotPickPreviousWinner_WhenOtherCandidatesExist()
    {
        var evt = ActiveEvent() with
        {
            Config = new EventConfig { WinnerCount = 3 },
            Winners = TestWinners.Won("mov1")
        };
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Already Won", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p2", TmdbId = 2, Title = "Other A", Year = "2021", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov3", EventId = evt.Id, ParticipantId = "p3", TmdbId = 3, Title = "Other B", Year = "2022", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        for (var i = 0; i < 30; i++)
        {
            var result = await _sut.HandleAsync("evt1");
            Assert.NotEqual("mov1", result.Winner.Id);
        }
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    [Fact]
    public async Task HandleAsync_TwoWinnerNightPendingAfterItsFirstDraw_DrawsTheSecondFilm()
    {
        var threeHoursAfterTheStart = new DateTimeOffset(2026, 11, 14, 22, 0, 0, TimeSpan.Zero);
        var evt = ActiveEvent() with
        {
            Date = "2026-11-14",
            Time = "20:00",
            Config = new EventConfig { WinnerCount = 2 },
            Winners = TestWinners.Won("mov1")
        };
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "First Pick", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow },
            new() { Id = "mov2", EventId = evt.Id, ParticipantId = "p2", TmdbId = 2, Title = "Second Pick", Year = "2021", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        Event? captured = null;
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => e);
        var sut = new LaunchWheelHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _currentUserAccessor.Object,
            _posterStore.Object,
            NullLogger<LaunchWheelHandler>.Instance,
            new FixedClock(threeHoursAfterTheStart));

        var result = await sut.HandleAsync("evt1");

        Assert.Equal("mov2", result.Winner.Id);
        Assert.NotNull(captured);
        Assert.Equal(["mov1", "mov2"], captured.GetWinnerMovieIds());
        Assert.True(captured.IsFinished(threeHoursAfterTheStart));
    }
}

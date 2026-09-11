using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LaunchWheel;
using MoviePicker.Api.Application.UseCases.Shared;
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
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor;
    private readonly Mock<ICurrentUserAccessor> _currentUserAccessor;
    private readonly Mock<IPosterImageStore> _posterStore;
    private readonly Mock<IWinnerAnnouncer> _winnerAnnouncer;
    private readonly LaunchWheelHandler _sut;

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

    public LaunchWheelHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _voteRepo = new Mock<IVoteRepository>();
        _hostTokenAccessor = new Mock<IHostTokenAccessor>();
        _currentUserAccessor = new Mock<ICurrentUserAccessor>();
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns((string?)null);
        _voteRepo.Setup(r => r.AggregateScoresByMovieIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, VoteScoreAggregate>());
        _posterStore = new Mock<IPosterImageStore>();
        _posterStore.Setup(s => s.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? u) => u);
        _posterStore.Setup(s => s.RegisterTmdbSourceAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _posterStore
            .Setup(s => s.RegisterTmdbSourcesAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _winnerAnnouncer = new Mock<IWinnerAnnouncer>();
        _sut = new LaunchWheelHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _voteRepo.Object,
            _hostTokenAccessor.Object,
            _currentUserAccessor.Object,
            _posterStore.Object,
            _winnerAnnouncer.Object,
            NullLogger<LaunchWheelHandler>.Instance);
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
    public async Task HandleAsync_EventFinished_ThrowsBadRequestException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht1", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventAlreadyClosed_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2030-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht1", ClosedAt = DateTimeOffset.UtcNow, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_NoMovies_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync([]);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("Aucun film", ex.Message);
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
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("exclus", ex.Message);
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
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
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
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("mov2", result.Winner.Id);
        Assert.Contains("gagnant direct", result.Message);
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
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
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
        Assert.Contains("gagnant direct", result.Message);
        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), "Winner", WinnerPickMethod.Wheel, It.IsAny<CancellationToken>()),
            Times.Once);
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
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
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
            CreatorUserId = "u1",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "A", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("u1");
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("mov1", result.Winner.Id);
    }
}

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

public sealed class LaunchWheelHandlerWinnerSlotsTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IVoteRepository> _votes = new();
    private readonly Mock<IHostTokenAccessor> _hostToken = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly Mock<IPosterImageStore> _posters = new();
    private readonly Mock<IWinnerAnnouncer> _announcer = new();
    private readonly LaunchWheelHandler _sut;

    public LaunchWheelHandlerWinnerSlotsTests()
    {
        _currentUser.Setup(c => c.GetUserId()).Returns((string?)null);
        _hostToken.Setup(h => h.GetHostToken()).Returns("ht1");
        _votes
            .Setup(r => r.AggregateScoresByMovieIdsAsync(
                It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, VoteScoreAggregate>());
        _posters.Setup(s => s.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? u) => u);
        _posters
            .Setup(s => s.RegisterTmdbSourceAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        _sut = new LaunchWheelHandler(
            _events.Object,
            _movies.Object,
            _votes.Object,
            _hostToken.Object,
            _currentUser.Object,
            _posters.Object,
            _announcer.Object,
            NullLogger<LaunchWheelHandler>.Instance);
    }

    private static Movie Film(string id) => new()
    {
        Id = id,
        EventId = "evt1",
        ParticipantId = "p1",
        TmdbId = 1,
        Title = "Film " + id,
        Year = "2020",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private void GivenEvent(int winnerCount, params string[] alreadyWon)
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "soiree",
            HostToken = "ht1",
            Config = new EventConfig { WinnerCount = winnerCount },
            Winners = TestWinners.Won(alreadyWon),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _events.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
    }

    private void GivenMovies(params string[] ids) =>
        _movies.Setup(r => r.ListByEventIdAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ids.Select(Film).ToList());

    [Fact]
    public async Task HandleAsync_ConfiguredCountReached_Throws()
    {
        GivenEvent(2, "m1", "m2");
        GivenMovies("m1", "m2", "m3");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1"));

        Assert.Equal(WinnerSlots.AllDrawnMessage(2), ex.Message);
    }

    [Fact]
    public async Task HandleAsync_ConfiguredCountReached_DoesNotTouchTheEvent()
    {
        GivenEvent(1, "m1");
        GivenMovies("m1", "m2");

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1"));

        _events.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_EveryMovieAlreadyDrawn_Throws()
    {
        GivenEvent(5, "m1", "m2");
        GivenMovies("m1", "m2");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1"));

        Assert.Equal(WinnerSlots.NothingLeftToDrawMessage, ex.Message);
    }

    [Fact]
    public async Task HandleAsync_SlotsLeft_AppendsToThePalmaresWithoutLosingTheOrder()
    {
        GivenEvent(3, "m1", "m2");
        GivenMovies("m1", "m2", "m3");
        Event? saved = null;
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e)
            .Callback((Event e, CancellationToken _) => saved = e);

        await _sut.HandleAsync("evt1");

        Assert.NotNull(saved);
        Assert.Equal(new[] { "m1", "m2", "m3" }, saved!.WinnerMovieIds);
    }

    [Fact]
    public async Task HandleAsync_NeverDrawsAMovieThatAlreadyWon()
    {
        GivenEvent(4, "m1", "m2");
        GivenMovies("m1", "m2", "m3", "m4");

        for (var i = 0; i < 30; i++)
        {
            var result = await _sut.HandleAsync("evt1");
            Assert.Contains(result.Winner.Id, new[] { "m3", "m4" });
        }
    }

    [Fact]
    public async Task HandleAsync_LastDrawableMovie_AnnouncesTheDirectWin()
    {
        GivenEvent(3, "m1", "m2");
        GivenMovies("m1", "m2", "m3");

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Un seul film dans le tirage : gagnant direct.", result.Message);
    }
}

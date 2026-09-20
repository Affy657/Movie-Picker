using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieRatings;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.MovieRatings;

public sealed class SetMovieRatingHandlerTests
{
    private const string OwnerUserId = "user-owner";
    private const string ParticipantId = "p12345678901234567890123";
    private const string WinnerMovieId = "mov-winner";
    private const string OtherMovieId = "mov-other";

    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IMovieRatingRepository> _ratingRepo = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly SetMovieRatingHandler _sut;

    public SetMovieRatingHandlerTests()
    {
        _currentUser.Setup(u => u.GetUserId()).Returns(OwnerUserId);
        _ratingRepo
            .Setup(r => r.UpsertAsync(It.IsAny<MovieRating>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MovieRating r, CancellationToken _) => r with { Id = "rating-1" });
        _sut = new SetMovieRatingHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _participantRepo.Object,
            _ratingRepo.Object,
            _currentUser.Object,
            TimeProvider.System);
    }

    private static Event FinishedEventWithWinner() =>
        new EventEntityBuilder().WithId("evt1").WithSlug("soiree").Closed().Build() with
        {
            Winners = TestWinners.Won(WinnerMovieId)
        };

    private static Movie MovieIn(Event evt, string id) => new()
    {
        Id = id,
        EventId = evt.Id,
        ParticipantId = "p0",
        TmdbId = 603,
        Title = "The Matrix",
        Year = "1999",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Participant ParticipantIn(Event evt, string? userId = OwnerUserId) => new()
    {
        Id = ParticipantId,
        EventId = evt.Id,
        Pseudo = "Alice",
        UserId = userId,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private void Arrange(Event evt, Movie? movie, Participant? participant)
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync(evt.Slug, It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo
            .Setup(r => r.GetByIdAndEventIdAsync(It.IsAny<string>(), evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(movie);
        _participantRepo
            .Setup(r => r.FindByIdAndEventIdAsync(ParticipantId, evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(participant);
    }

    private static SetMovieRatingRequest Request(int value = 7) =>
        new() { ParticipantId = ParticipantId, Value = value };

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFound()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("ghost", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("ghost", WinnerMovieId, Request()));
        Assert.Equal(ErrorCodes.EventNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_EventStillRunning_ThrowsConflict()
    {
        var evt = new EventEntityBuilder().WithId("evt1").WithSlug("soiree").Build() with
        {
            Winners = TestWinners.Won(WinnerMovieId)
        };
        Arrange(evt, MovieIn(evt, WinnerMovieId), ParticipantIn(evt));

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("soiree", WinnerMovieId, Request()));
        Assert.Equal(ErrorCodes.RatingOnlyAfterEvent, ex.Reason);
        _ratingRepo.Verify(r => r.UpsertAsync(It.IsAny<MovieRating>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_MovieNotInEvent_ThrowsNotFound()
    {
        var evt = FinishedEventWithWinner();
        Arrange(evt, null, ParticipantIn(evt));

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("soiree", "mov-ghost", Request()));
        Assert.Equal(ErrorCodes.MovieNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_MovieNotChosen_ThrowsConflict()
    {
        var evt = FinishedEventWithWinner();
        Arrange(evt, MovieIn(evt, OtherMovieId), ParticipantIn(evt));

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("soiree", OtherMovieId, Request()));
        Assert.Equal(ErrorCodes.RatingOnlyChosenMovie, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_UnknownParticipant_ThrowsBadRequest()
    {
        var evt = FinishedEventWithWinner();
        Arrange(evt, MovieIn(evt, WinnerMovieId), null);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("soiree", WinnerMovieId, Request()));
        Assert.Equal(ErrorCodes.InvalidParticipant, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesParticipation_ThrowsForbidden()
    {
        var evt = FinishedEventWithWinner();
        Arrange(evt, MovieIn(evt, WinnerMovieId), ParticipantIn(evt, userId: "user-other"));

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("soiree", WinnerMovieId, Request()));
        Assert.Equal(ErrorCodes.RatingOwnParticipationOnly, ex.Reason);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public async Task HandleAsync_ValueOutOfRange_ThrowsBadRequest(int value)
    {
        var evt = FinishedEventWithWinner();
        Arrange(evt, MovieIn(evt, WinnerMovieId), ParticipantIn(evt));

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("soiree", WinnerMovieId, Request(value)));
        Assert.Equal(ErrorCodes.RatingOutOfRange, ex.Reason);
        _ratingRepo.Verify(r => r.UpsertAsync(It.IsAny<MovieRating>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Success_UpsertsTheRatingAndBumpsTheEventView()
    {
        var evt = FinishedEventWithWinner();
        Arrange(evt, MovieIn(evt, WinnerMovieId), ParticipantIn(evt));

        var res = await _sut.HandleAsync("soiree", WinnerMovieId, Request(7));

        Assert.Equal(ParticipantId, res.ParticipantId);
        Assert.Equal(7, res.Value);
        _ratingRepo.Verify(
            r => r.UpsertAsync(
                It.Is<MovieRating>(x => x.EventId == evt.Id && x.MovieId == WinnerMovieId && x.ParticipantId == ParticipantId && x.Value == 7),
                It.IsAny<CancellationToken>()),
            Times.Once);
        _eventRepo.Verify(r => r.MarkChangedAsync(evt.Id, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_EventClosedByTheGuardRail_IsRatable()
    {
        var pastNight = new EventEntityBuilder().WithId("evt1").WithSlug("soiree").Build() with
        {
            Date = "2020-01-01",
            Time = "20:00",
            Winners = TestWinners.Won(WinnerMovieId)
        };
        Arrange(pastNight, MovieIn(pastNight, WinnerMovieId), ParticipantIn(pastNight));

        var res = await _sut.HandleAsync("soiree", WinnerMovieId, Request(10));

        Assert.Equal(10, res.Value);
    }
}

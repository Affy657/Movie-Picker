using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieRatings;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.MovieRatings;

public sealed class DeleteMovieRatingHandlerTests
{
    private const string OwnerUserId = "user-owner";
    private const string ParticipantId = "p12345678901234567890123";
    private const string WinnerMovieId = "mov-winner";

    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IParticipantRepository> _participantRepo = new();
    private readonly Mock<IMovieRatingRepository> _ratingRepo = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly DeleteMovieRatingHandler _sut;

    public DeleteMovieRatingHandlerTests()
    {
        _currentUser.Setup(u => u.GetUserId()).Returns(OwnerUserId);
        _sut = new DeleteMovieRatingHandler(
            _eventRepo.Object,
            _participantRepo.Object,
            _ratingRepo.Object,
            _currentUser.Object);
    }

    private static Event EventWithWinner() =>
        new EventEntityBuilder().WithId("evt1").WithSlug("soiree").Closed().Build() with
        {
            Winners = TestWinners.Won(WinnerMovieId)
        };

    private void Arrange(Event evt, string? participantUserId = OwnerUserId)
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync(evt.Slug, It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo
            .Setup(r => r.FindByIdAndEventIdAsync(ParticipantId, evt.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Participant
            {
                Id = ParticipantId,
                EventId = evt.Id,
                Pseudo = "Alice",
                UserId = participantUserId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesParticipation_ThrowsForbidden()
    {
        var evt = EventWithWinner();
        Arrange(evt, participantUserId: "user-other");

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("soiree", WinnerMovieId, ParticipantId));
        Assert.Equal(ErrorCodes.RatingOwnParticipationOnly, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_NothingToDelete_ThrowsNotFound()
    {
        var evt = EventWithWinner();
        Arrange(evt);
        _ratingRepo
            .Setup(r => r.DeleteAsync(evt.Id, WinnerMovieId, ParticipantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("soiree", WinnerMovieId, ParticipantId));
        Assert.Equal(ErrorCodes.RatingNotFound, ex.Reason);
        _eventRepo.Verify(r => r.MarkChangedAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Success_DeletesAndBumpsTheEventView()
    {
        var evt = EventWithWinner();
        Arrange(evt);
        _ratingRepo
            .Setup(r => r.DeleteAsync(evt.Id, WinnerMovieId, ParticipantId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await _sut.HandleAsync("soiree", WinnerMovieId, ParticipantId);

        _eventRepo.Verify(r => r.MarkChangedAsync(evt.Id, It.IsAny<CancellationToken>()), Times.Once);
    }
}

using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Shared;

public sealed class EventChildDataTests
{
    private readonly Mock<IVoteRepository> _votes = new();
    private readonly Mock<ISeenMarkRepository> _seenMarks = new();
    private readonly Mock<IMovieRatingRepository> _ratings = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();

    private static IReadOnlyCollection<string> Exactly(params string[] expected) =>
        It.Is<IReadOnlyCollection<string>>(ids => ids.Order(StringComparer.Ordinal).SequenceEqual(expected));

    [Fact]
    public async Task PurgeMoviesAsync_DeletesVotesSeenMarksRatingsAndTheMoviesThemselves()
    {
        await EventChildData.PurgeMoviesAsync(
            _votes.Object, _seenMarks.Object, _ratings.Object, _movies.Object, "evt1", ["m1", "m2"], CancellationToken.None);

        _votes.Verify(r => r.DeleteByMovieIdsAsync(Exactly("m1", "m2"), It.IsAny<CancellationToken>()), Times.Once);
        _seenMarks.Verify(r => r.DeleteByMovieIdsAsync("evt1", Exactly("m1", "m2"), It.IsAny<CancellationToken>()), Times.Once);
        _ratings.Verify(r => r.DeleteByMovieIdsAsync("evt1", Exactly("m1", "m2"), It.IsAny<CancellationToken>()), Times.Once);
        _movies.Verify(r => r.DeleteByIdsAsync(Exactly("m1", "m2"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PurgeParticipantTracesAsync_PurgesTheirMoviesThenTheirOwnVotesSeenMarksAndRatings()
    {
        _movies.Setup(r => r.ListIdsByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(["m1"]);

        var movieIds = await EventChildData.PurgeParticipantTracesAsync(
            _votes.Object, _seenMarks.Object, _ratings.Object, _movies.Object, "evt1", "p1", CancellationToken.None);

        Assert.Equal(["m1"], movieIds);
        _movies.Verify(r => r.DeleteByIdsAsync(Exactly("m1"), It.IsAny<CancellationToken>()), Times.Once);
        _ratings.Verify(r => r.DeleteByMovieIdsAsync("evt1", Exactly("m1"), It.IsAny<CancellationToken>()), Times.Once);
        _votes.Verify(r => r.DeleteByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()), Times.Once);
        _seenMarks.Verify(r => r.DeleteByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()), Times.Once);
        _ratings.Verify(r => r.DeleteByEventAndParticipantAsync("evt1", "p1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PurgeEventAsync_DeletesEveryChildCollection_AndCountsWhatItRemoved()
    {
        _votes.Setup(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(5);
        _seenMarks.Setup(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(4);
        _ratings.Setup(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(3);
        _movies.Setup(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(2);
        _participants.Setup(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var counts = await EventChildData.PurgeEventAsync(
            _votes.Object,
            _seenMarks.Object,
            _ratings.Object,
            _movies.Object,
            _participants.Object,
            _notifications.Object,
            "evt1",
            CancellationToken.None);

        Assert.Equal(new EventChildCounts(Votes: 5, SeenMarks: 4, Ratings: 3, Movies: 2, Participants: 1), counts);
        _notifications.Verify(r => r.DeleteByEventIdAsync("evt1", It.IsAny<CancellationToken>()), Times.Once);
    }
}

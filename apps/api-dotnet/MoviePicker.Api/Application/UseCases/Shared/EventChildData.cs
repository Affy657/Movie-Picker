using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Shared;

internal sealed record EventChildCounts(long Votes, long SeenMarks, long Ratings, long Movies, long Participants);

internal static class EventChildData
{
    public static async Task PurgeMoviesAsync(
        IVoteRepository votes,
        ISeenMarkRepository seenMarks,
        IMovieRatingRepository ratings,
        IMovieRepository movies,
        string eventId,
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct)
    {
        await votes.DeleteByMovieIdsAsync(movieIds, ct);
        await seenMarks.DeleteByMovieIdsAsync(eventId, movieIds, ct);
        await ratings.DeleteByMovieIdsAsync(eventId, movieIds, ct);
        await movies.DeleteByIdsAsync(movieIds, ct);
    }

    public static async Task<IReadOnlyList<string>> PurgeParticipantTracesAsync(
        IVoteRepository votes,
        ISeenMarkRepository seenMarks,
        IMovieRatingRepository ratings,
        IMovieRepository movies,
        string eventId,
        string participantId,
        CancellationToken ct)
    {
        var movieIds = await movies.ListIdsByEventAndParticipantAsync(eventId, participantId, ct);
        await PurgeMoviesAsync(votes, seenMarks, ratings, movies, eventId, movieIds, ct);
        await votes.DeleteByEventAndParticipantAsync(eventId, participantId, ct);
        await seenMarks.DeleteByEventAndParticipantAsync(eventId, participantId, ct);
        await ratings.DeleteByEventAndParticipantAsync(eventId, participantId, ct);
        return movieIds;
    }

    public static async Task<EventChildCounts> PurgeEventAsync(
        IVoteRepository votes,
        ISeenMarkRepository seenMarks,
        IMovieRatingRepository ratings,
        IMovieRepository movies,
        IParticipantRepository participants,
        IUserNotificationRepository notifications,
        string eventId,
        CancellationToken ct)
    {
        var voteCount = await votes.DeleteByEventIdAsync(eventId, ct);
        var seenMarkCount = await seenMarks.DeleteByEventIdAsync(eventId, ct);
        var ratingCount = await ratings.DeleteByEventIdAsync(eventId, ct);
        var movieCount = await movies.DeleteByEventIdAsync(eventId, ct);
        var participantCount = await participants.DeleteByEventIdAsync(eventId, ct);
        await notifications.DeleteByEventIdAsync(eventId, ct);
        return new EventChildCounts(voteCount, seenMarkCount, ratingCount, movieCount, participantCount);
    }
}

using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public readonly record struct VoteScoreAggregate(int Score, int Up, int Down);

public interface IVoteRepository
{
    Task DeleteByMovieIdAsync(string movieId, CancellationToken ct = default);

    Task DeleteByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default);

    Task<bool> DeleteByMovieAndParticipantAsync(string movieId, string participantId, CancellationToken ct = default);

    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default);

    Task<Vote> UpsertAsync(Vote vote, CancellationToken ct = default);
    Task<IReadOnlyDictionary<string, VoteScoreAggregate>> AggregateScoresByMovieIdsAsync(
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default);

    Task<IReadOnlyDictionary<string, int>> GetParticipantVotesByEventAsync(
        string eventId,
        string participantId,
        CancellationToken ct = default);

    Task<int> CountByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default);
}

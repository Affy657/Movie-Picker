using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public readonly record struct VoteScoreAggregate(int Score, int Up, int Down);

public interface IVoteRepository
{
    Task DeleteByMovieIdAsync(string movieId, CancellationToken ct = default);
    Task<Vote> UpsertAsync(Vote vote, CancellationToken ct = default);
    Task<IReadOnlyDictionary<string, VoteScoreAggregate>> AggregateScoresByMovieIdsAsync(
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default);
}

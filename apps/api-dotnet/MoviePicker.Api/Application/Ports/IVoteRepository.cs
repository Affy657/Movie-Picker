using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public readonly record struct VoteScoreAggregate(int Score, int Up, int Down);

public interface IVoteRepository
{
    Task DeleteByMovieIdAsync(string movieId, CancellationToken ct = default);

    /// <summary>Supprime tous les votes émis par un participant dans une soirée donnée.</summary>
    Task DeleteByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default);

    /// <summary>Supprime tous les votes d'une soirée. Retourne le nombre supprimé.</summary>
    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default);

    Task<Vote> UpsertAsync(Vote vote, CancellationToken ct = default);
    Task<IReadOnlyDictionary<string, VoteScoreAggregate>> AggregateScoresByMovieIdsAsync(
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default);
}

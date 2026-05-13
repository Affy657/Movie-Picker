using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public readonly record struct VoteScoreAggregate(int Score, int Up, int Down);

public interface IVoteRepository
{
    Task DeleteByMovieIdAsync(string movieId, CancellationToken ct = default);

    /// <summary>Supprime tous les votes émis par un participant dans une soirée donnée.</summary>
    Task DeleteByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default);

    /// <summary>Supprime le vote d'un participant pour un film. Retourne <c>true</c> si un vote a été supprimé.</summary>
    Task<bool> DeleteByMovieAndParticipantAsync(string movieId, string participantId, CancellationToken ct = default);

    /// <summary>Supprime tous les votes d'une soirée. Retourne le nombre supprimé.</summary>
    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default);

    Task<Vote> UpsertAsync(Vote vote, CancellationToken ct = default);
    Task<IReadOnlyDictionary<string, VoteScoreAggregate>> AggregateScoresByMovieIdsAsync(
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default);

    /// <summary>Renvoie les votes d'un participant pour les films d'une soirée, indexés par <c>movieId</c>.</summary>
    Task<IReadOnlyDictionary<string, int>> GetParticipantVotesByEventAsync(
        string eventId,
        string participantId,
        CancellationToken ct = default);
}

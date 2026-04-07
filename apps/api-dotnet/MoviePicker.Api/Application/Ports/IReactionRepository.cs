using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public readonly record struct ReactionKindAggregate(string ReactionId, int Count, IReadOnlyList<string> ParticipantIds);

public interface IReactionRepository
{
    /// <summary>Ajoute une réaction ; si déjà présente, renvoie l’existant (idempotent).</summary>
    Task<Reaction> AddAsync(Reaction reaction, CancellationToken ct = default);

    Task<bool> DeleteAsync(string eventId, string movieId, string participantId, string reactionId, CancellationToken ct = default);

    Task DeleteByMovieIdAsync(string eventId, string movieId, CancellationToken ct = default);

    Task<IReadOnlyDictionary<string, IReadOnlyList<ReactionKindAggregate>>> AggregateByMovieIdsAsync(
        string eventId,
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default);
}

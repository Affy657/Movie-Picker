using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public readonly record struct SeenMarkAggregate(int Count, IReadOnlyList<string> ParticipantIds);

public interface ISeenMarkRepository
{
    /// <summary>Ajoute une marque « déjà vu » ; si déjà présente, renvoie l'existante (idempotent).</summary>
    Task<SeenMark> AddAsync(SeenMark mark, CancellationToken ct = default);

    Task<bool> DeleteAsync(string eventId, string movieId, string participantId, CancellationToken ct = default);

    Task DeleteByMovieIdAsync(string eventId, string movieId, CancellationToken ct = default);

    /// <summary>Supprime toutes les marques « déjà vu » d'un participant dans une soirée donnée.</summary>
    Task DeleteByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default);

    /// <summary>Supprime toutes les marques « déjà vu » d'une soirée. Retourne le nombre supprimé.</summary>
    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default);

    Task<IReadOnlyDictionary<string, SeenMarkAggregate>> AggregateByMovieIdsAsync(
        string eventId,
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default);
}

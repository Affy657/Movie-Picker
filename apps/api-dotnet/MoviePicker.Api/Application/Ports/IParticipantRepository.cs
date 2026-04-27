using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IParticipantRepository
{
    Task<Participant?> FindByEventAndPseudoAsync(string eventId, string pseudo, CancellationToken ct = default);
    Task<Participant?> FindByEventAndUserIdAsync(string eventId, string userId, CancellationToken ct = default);
    Task<Participant?> FindByIdAndEventIdAsync(string participantId, string eventId, CancellationToken ct = default);
    Task<IReadOnlyDictionary<string, string>> GetPseudosByIdsAsync(
        IReadOnlyCollection<string> participantIds,
        CancellationToken ct = default);
    Task<Participant> AddAsync(Participant participant, CancellationToken ct = default);

    /// <summary>Identifiants d’événements où le compte est inscrit (participants avec <c>userId</c>).</summary>
    Task<IReadOnlyList<string>> ListDistinctEventIdsByUserIdAsync(string userId, CancellationToken ct = default);

    Task<int> CountByEventIdAsync(string eventId, CancellationToken ct = default);

    /// <summary>Nombre de participants par <c>eventId</c> (clés absentes = 0).</summary>
    Task<IReadOnlyDictionary<string, int>> CountByEventIdsAsync(IReadOnlyCollection<string> eventIds, CancellationToken ct = default);

    /// <summary>Participants d'une soirée, triés par ordre d'arrivée (ancien → récent).</summary>
    Task<IReadOnlyList<Participant>> ListByEventIdAsync(string eventId, CancellationToken ct = default);

    /// <summary>Supprime un participant d'une soirée. Idempotent : renvoie <c>false</c> si introuvable.</summary>
    Task<bool> DeleteAsync(string participantId, string eventId, CancellationToken ct = default);

    /// <summary>Supprime tous les participants d'une soirée. Retourne le nombre supprimé.</summary>
    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default);
}

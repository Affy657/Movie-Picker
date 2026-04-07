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
}

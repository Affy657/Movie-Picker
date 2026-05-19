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

    Task<IReadOnlyList<string>> ListDistinctEventIdsByUserIdAsync(string userId, CancellationToken ct = default);

    Task<int> CountByEventIdAsync(string eventId, CancellationToken ct = default);

    Task<IReadOnlyDictionary<string, int>> CountByEventIdsAsync(IReadOnlyCollection<string> eventIds, CancellationToken ct = default);

    Task<IReadOnlyList<Participant>> ListByEventIdAsync(string eventId, CancellationToken ct = default);

    Task<bool> DeleteAsync(string participantId, string eventId, CancellationToken ct = default);

    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default);
}

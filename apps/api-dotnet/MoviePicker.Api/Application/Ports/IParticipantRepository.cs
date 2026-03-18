using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IParticipantRepository
{
    Task<Participant?> FindByEventAndPseudoAsync(string eventId, string pseudo, CancellationToken ct = default);
    Task<Participant?> FindByIdAndEventIdAsync(string participantId, string eventId, CancellationToken ct = default);
    Task<IReadOnlyDictionary<string, string>> GetPseudosByIdsAsync(
        IReadOnlyCollection<string> participantIds,
        CancellationToken ct = default);
    Task<Participant> AddAsync(Participant participant, CancellationToken ct = default);
}

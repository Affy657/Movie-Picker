using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IEventPresenceRepository
{
    Task TouchAsync(string eventId, string participantId, DateTimeOffset seenUntil, CancellationToken ct = default);

    Task SetProposingAsync(
        string eventId,
        string participantId,
        DateTimeOffset seenUntil,
        DateTimeOffset? proposingUntil,
        CancellationToken ct = default);

    Task<IReadOnlyList<ParticipantPresence>> ListActiveAsync(string eventId, DateTimeOffset now, CancellationToken ct = default);
}

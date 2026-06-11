using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public readonly record struct SeenMarkAggregate(int Count, IReadOnlyList<string> ParticipantIds);

public interface ISeenMarkRepository
{
    Task<SeenMark> AddAsync(SeenMark mark, CancellationToken ct = default);

    Task<bool> DeleteAsync(string eventId, string movieId, string participantId, CancellationToken ct = default);

    Task DeleteByMovieIdAsync(string eventId, string movieId, CancellationToken ct = default);

    Task DeleteByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default);

    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default);

    Task<IReadOnlyDictionary<string, SeenMarkAggregate>> AggregateByMovieIdsAsync(
        string eventId,
        IReadOnlyCollection<string> movieIds,
        CancellationToken ct = default);

    Task<int> CountByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default);

    Task<IReadOnlyList<SeenMark>> ListByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default);
}

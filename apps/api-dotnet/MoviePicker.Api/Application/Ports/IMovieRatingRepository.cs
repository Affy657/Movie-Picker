using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IMovieRatingRepository
{
    Task<MovieRating> UpsertAsync(MovieRating rating, CancellationToken ct = default);

    Task<bool> DeleteAsync(string eventId, string movieId, string participantId, CancellationToken ct = default);

    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default);

    Task<IReadOnlyList<MovieRating>> ListByEventIdAsync(string eventId, CancellationToken ct = default);

    Task<IReadOnlyList<MovieRating>> ListByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default);
}

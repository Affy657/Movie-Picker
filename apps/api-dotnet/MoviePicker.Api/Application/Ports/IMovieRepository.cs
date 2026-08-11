using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IMovieRepository
{
    Task<Movie?> GetByIdAsync(string movieId, CancellationToken ct = default);
    Task<Movie?> GetByIdAndEventIdAsync(string movieId, string eventId, CancellationToken ct = default);
    Task<IReadOnlyList<Movie>> ListByEventIdAsync(string eventId, CancellationToken ct = default);
    Task<bool> ExistsByEventAndTmdbIdAsync(string eventId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);
    Task<bool> ExistsByEventAndTitleCaseInsensitiveAsync(string eventId, string title, CancellationToken ct = default);
    Task<int> CountByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default);
    Task<Movie> InsertAsync(Movie movie, CancellationToken ct = default);
    Task DeleteAsync(string movieId, CancellationToken ct = default);
    Task UpdatePitchNoteAsync(string movieId, string? pitchNote, CancellationToken ct = default);

    Task UpdateWheelExclusionAsync(string movieId, bool excluded, CancellationToken ct = default);

    Task UpdateGenresAsync(string movieId, IReadOnlyList<int> genreIds, CancellationToken ct = default);

    Task<IReadOnlyList<Movie>> ListByParticipantIdsAsync(IReadOnlyCollection<string> participantIds, CancellationToken ct = default);

    Task<IReadOnlyList<Movie>> ListMissingGenresAsync(int limit, CancellationToken ct = default);

    Task<IReadOnlyList<string>> ListIdsByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default);

    Task<int> CountByEventIdAsync(string eventId, CancellationToken ct = default);

    Task<IReadOnlyDictionary<string, int>> CountByEventIdsAsync(IReadOnlyCollection<string> eventIds, CancellationToken ct = default);

    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default);
}

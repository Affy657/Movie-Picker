using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IMovieRepository
{
    Task<Movie?> GetByIdAsync(string movieId, CancellationToken ct = default);
    Task<Movie?> GetByIdAndEventIdAsync(string movieId, string eventId, CancellationToken ct = default);
    Task<IReadOnlyList<Movie>> ListByEventIdAsync(string eventId, CancellationToken ct = default);
    Task<bool> ExistsByEventAndTmdbIdAsync(string eventId, int tmdbId, CancellationToken ct = default);
    Task<bool> ExistsByEventAndTitleCaseInsensitiveAsync(string eventId, string title, CancellationToken ct = default);
    Task<int> CountByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default);
    Task<Movie> InsertAsync(Movie movie, CancellationToken ct = default);
    Task DeleteAsync(string movieId, CancellationToken ct = default);

    /// <summary>Identifiants des films proposés par un participant dans une soirée donnée.</summary>
    Task<IReadOnlyList<string>> ListIdsByEventAndParticipantAsync(string eventId, string participantId, CancellationToken ct = default);

    Task<int> CountByEventIdAsync(string eventId, CancellationToken ct = default);

    /// <summary>Nombre de films proposés par <c>eventId</c> (clés absentes = 0).</summary>
    Task<IReadOnlyDictionary<string, int>> CountByEventIdsAsync(IReadOnlyCollection<string> eventIds, CancellationToken ct = default);

    /// <summary>Supprime tous les films d'une soirée. Retourne le nombre supprimé.</summary>
    Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default);
}

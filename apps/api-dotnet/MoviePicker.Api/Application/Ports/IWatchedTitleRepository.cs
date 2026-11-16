using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IWatchedTitleRepository
{
    Task<IReadOnlyList<WatchedTitle>> ListByOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<IReadOnlyList<MovieListTitle>> ListTitlesByOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<WatchedTitle?> GetAsync(string ownerId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);

    Task<WatchedTitle> AddIfAbsentAsync(WatchedTitle title, CancellationToken ct = default);

    Task<WatchedTitle?> SetRatingAsync(
        string ownerId,
        int tmdbId,
        MovieMediaType mediaType,
        int? rating,
        DateTimeOffset updatedAt,
        CancellationToken ct = default);

    Task<bool> RemoveAsync(string ownerId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);

    Task<bool> ApplyLetterboxdRatingAsync(
        string ownerId,
        int tmdbId,
        MovieMediaType mediaType,
        int? rating,
        DateTimeOffset updatedAt,
        CancellationToken ct = default);

    Task<bool> LinkLetterboxdAsync(
        string ownerId,
        int tmdbId,
        MovieMediaType mediaType,
        string slug,
        CancellationToken ct = default);

    Task<long> RemoveFromLetterboxdAsync(string ownerId, IReadOnlyCollection<string> ids, CancellationToken ct = default);

    Task<long> CountFromLetterboxdAsync(string ownerId, CancellationToken ct = default);

    Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default);
}

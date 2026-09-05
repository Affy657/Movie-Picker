using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IWatchlistRepository
{
    Task<IReadOnlyList<WatchlistItem>> ListByUserIdAsync(string userId, int limit = 500, CancellationToken ct = default);

    Task<IReadOnlyList<WatchlistItem>> ListPageByUserIdAsync(
        string userId,
        int skip,
        int take,
        CancellationToken ct = default);

    Task<long> CountByUserIdAsync(string userId, CancellationToken ct = default);

    Task<WatchlistItem?> GetOneAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);

    Task<bool> AddAsync(WatchlistItem item, CancellationToken ct = default);

    Task<bool> RemoveAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);

    Task<bool> SetLetterboxdSlugAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        string slug,
        CancellationToken ct = default);

    Task<long> RemoveForUsersAsync(IReadOnlyCollection<string> userIds, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);

    Task<long> DeleteAllForUserAsync(string userId, CancellationToken ct = default);

    Task UpdateGenresAsync(string itemId, IReadOnlyList<int> genreIds, CancellationToken ct = default);

    Task<IReadOnlyList<WatchlistItem>> ListMissingGenresAsync(int limit, CancellationToken ct = default);

    Task UpdateRuntimeAsync(string itemId, int runtimeMinutes, CancellationToken ct = default);

    Task<IReadOnlyList<WatchlistItem>> ListMissingRuntimeAsync(int limit, CancellationToken ct = default);
}

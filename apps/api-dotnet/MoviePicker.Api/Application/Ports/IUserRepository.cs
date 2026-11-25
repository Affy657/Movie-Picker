using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public sealed record PublicProfileRef(string Handle, DateTimeOffset UpdatedAt)
{
    public string UserId { get; init; } = string.Empty;

    public bool HasProfileText { get; init; }

    public bool IsWatchlistPublic { get; init; }

    public static PublicProfileRef Of(User user) =>
        new(user.Handle, user.UpdatedAt)
        {
            UserId = user.Id,
            HasProfileText = !string.IsNullOrWhiteSpace(user.Bio) || user.Favorites.Count > 0,
            IsWatchlistPublic = user.IsWatchlistPublic
        };
}

public sealed record UserCard(
    string Id,
    string DisplayedAvatarId,
    string? Handle,
    bool IsProfilePublic,
    string DisplayName = "",
    AccentColor AccentColor = AccentColor.Default);

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<IReadOnlyList<User>> ListByIdsAsync(IReadOnlyCollection<string> ids, CancellationToken ct = default);
    Task<IReadOnlyList<UserCard>> ListCardsByIdsAsync(IReadOnlyCollection<string> ids, CancellationToken ct = default);
    Task<IReadOnlyList<UserCard>> ListCardsByHandlesAsync(IReadOnlyCollection<string> handles, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByHandleAsync(string handle, CancellationToken ct = default);
    Task<User?> GetByIdentityAsync(string provider, string subject, CancellationToken ct = default);
    Task<IReadOnlyList<User>> ListMissingHandleAsync(CancellationToken ct = default);
    Task<IReadOnlyList<User>> SearchPublicAsync(string query, int limit, CancellationToken ct = default);

    Task SetLetterboxdSyncStatusAsync(
        string userId,
        DateTimeOffset syncedAt,
        string? error,
        IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync> lists,
        CancellationToken ct = default);
    Task SetLetterboxdPendingReconciliationCountAsync(
        string userId,
        int pendingCount,
        CancellationToken ct = default);
    Task RecordLetterboxdPendingChoicesAsync(
        string userId,
        int pendingCount,
        IReadOnlyList<string> pendingChoiceKeys,
        CancellationToken ct = default);
    Task SetLetterboxdLinkedCountsAsync(
        string userId,
        int watchlistCount,
        int watchedCount,
        CancellationToken ct = default);
    Task<bool> MarkSupporterAsync(string userId, DateTimeOffset since, CancellationToken ct = default);
    Task<bool> AddEventTemplateAsync(
        string userId,
        EventTemplate template,
        int maxPerUser,
        DateTimeOffset now,
        CancellationToken ct = default);
    Task<bool> ReplaceEventTemplateAsync(
        string userId,
        EventTemplate template,
        DateTimeOffset now,
        CancellationToken ct = default);
    Task<bool> RemoveEventTemplateAsync(
        string userId,
        string templateId,
        DateTimeOffset now,
        CancellationToken ct = default);
    Task<bool> AddFavoriteAsync(
        string userId,
        FavoriteTitle favorite,
        int maxPerUser,
        DateTimeOffset now,
        CancellationToken ct = default);
    Task<bool> RemoveFavoriteAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        DateTimeOffset now,
        CancellationToken ct = default);
    Task<IReadOnlyList<PublicProfileRef>> ListPublicProfilesAsync(int limit, CancellationToken ct = default);
    Task<User> AddAsync(User user, CancellationToken ct = default);
    Task<User> UpdateAsync(User user, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, CancellationToken ct = default);
}

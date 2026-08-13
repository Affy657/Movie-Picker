using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public sealed record PublicProfileRef(string Handle, DateTimeOffset UpdatedAt);

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<IReadOnlyList<User>> ListByIdsAsync(IReadOnlyCollection<string> ids, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByHandleAsync(string handle, CancellationToken ct = default);
    Task<User?> GetByIdentityAsync(string provider, string subject, CancellationToken ct = default);
    Task<IReadOnlyList<User>> ListMissingHandleAsync(CancellationToken ct = default);
    Task<IReadOnlyList<User>> ListWithLetterboxdSyncEnabledAsync(CancellationToken ct = default);

    Task SetLetterboxdSyncStatusAsync(
        string userId,
        DateTimeOffset syncedAt,
        string? error,
        CancellationToken ct = default);
    Task<bool> MarkSupporterAsync(string userId, DateTimeOffset since, CancellationToken ct = default);
    Task<IReadOnlyList<PublicProfileRef>> ListPublicProfilesAsync(int limit, CancellationToken ct = default);
    Task<User> AddAsync(User user, CancellationToken ct = default);
    Task<User> UpdateAsync(User user, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, CancellationToken ct = default);
}

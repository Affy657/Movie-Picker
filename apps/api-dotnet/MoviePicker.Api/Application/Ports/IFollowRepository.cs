namespace MoviePicker.Api.Application.Ports;

public interface IFollowRepository
{
    /// <returns>true si l'insertion a eu lieu (nouveau follow), false si déjà existant (idempotent).</returns>
    Task<bool> FollowAsync(string followerId, string followeeId, CancellationToken ct = default);
    Task UnfollowAsync(string followerId, string followeeId, CancellationToken ct = default);
    Task<bool> IsFollowingAsync(string followerId, string followeeId, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetFollowingIdsAsync(string userId, int limit = 500, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetFollowerIdsAsync(string userId, int limit = 500, CancellationToken ct = default);
    Task<(int Following, int Followers)> GetCountsAsync(string userId, CancellationToken ct = default);
}

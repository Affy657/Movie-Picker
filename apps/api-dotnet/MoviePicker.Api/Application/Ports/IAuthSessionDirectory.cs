namespace MoviePicker.Api.Application.Ports;

public sealed record StoredAuthSession(
    string Key,
    string? UserAgent,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastSeenAt);

public interface IAuthSessionDirectory
{
    Task<IReadOnlyList<StoredAuthSession>> ListActiveForUserAsync(string userId, CancellationToken ct = default);
    Task<bool> RevokeForUserAsync(string userId, string sessionKey, CancellationToken ct = default);
}

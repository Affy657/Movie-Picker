namespace MoviePicker.Api.Domain.Entities;

/// <summary>Token de réinitialisation de mot de passe — usage unique, TTL court (cf. PasswordResetTokenFactory).</summary>
public sealed record PasswordResetToken
{
    public string Id { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public string TokenHash { get; init; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; init; }
    public DateTimeOffset? ConsumedAt { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public string? RequestIp { get; init; }
    public string? RequestUserAgent { get; init; }
}

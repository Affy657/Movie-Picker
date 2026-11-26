namespace MoviePicker.Api.Domain.Entities;

public sealed record EmailVerificationToken
{
    public string Id { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public string TokenHash { get; init; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; init; }
    public DateTimeOffset? ConsumedAt { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

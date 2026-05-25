namespace MoviePicker.Api.Domain.Entities;

public sealed record PushSubscription
{
    public string Id { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public string Endpoint { get; init; } = string.Empty;
    public string P256dh { get; init; } = string.Empty;
    public string Auth { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}

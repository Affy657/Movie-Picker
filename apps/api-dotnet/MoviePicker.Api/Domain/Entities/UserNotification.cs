namespace MoviePicker.Api.Domain.Entities;

public enum UserNotificationType
{
    NewFollower = 1
}

public sealed record UserNotification
{
    public string Id { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public UserNotificationType Type { get; init; }
    public string? ActorHandle { get; init; }
    public string? ActorDisplayName { get; init; }
    public string? ActorAvatarId { get; init; }
    public bool IsRead { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

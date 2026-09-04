namespace MoviePicker.Api.Domain.Entities;

public enum UserNotificationType
{
    NewFollower = 1,
    MovieAdded = 2,
    MoviePicked = 3,
    ParticipantJoined = 4,
    EventDeleted = 5,
    EventReminder1h = 6,
    EventReminder24h = 7,
    EventInvitation = 8,
    EventPending = 9,
    MoviePickedManually = 10,
    LetterboxdReconciliationPending = 11,
    EventDateChanged = 12,
}

public sealed record UserNotification
{
    public string Id { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public UserNotificationType Type { get; init; }
    public string? ActorHandle { get; init; }
    public string? ActorDisplayName { get; init; }
    public string? ActorAvatarId { get; init; }
    public string? EventId { get; init; }
    public string? EventSlug { get; init; }
    public string? EventTitle { get; init; }
    public string? MovieTitle { get; init; }
    public bool IsRead { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

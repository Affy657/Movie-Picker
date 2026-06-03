using System.ComponentModel.DataAnnotations;

namespace MoviePicker.Api.Application.DTOs;

public sealed record SubscribePushRequest
{
    [Required, Url, MaxLength(2048)]
    public string Endpoint { get; init; } = string.Empty;

    [Required, MaxLength(256)]
    public string P256dh { get; init; } = string.Empty;

    [Required, MaxLength(64)]
    public string Auth { get; init; } = string.Empty;
}

public sealed record UnsubscribePushRequest
{
    [Required, Url, MaxLength(2048)]
    public string Endpoint { get; init; } = string.Empty;
}

public sealed record NotificationPreferencesResponse
{
    public bool NotifyOnParticipantJoined { get; init; }
    public bool NotifyEventReminder { get; init; }
    public bool NotifyOnMovieAdded { get; init; }
    public bool NotifyOnMoviePicked { get; init; }
    public bool NotifyOnEventDeleted { get; init; }
    public bool NotifyOnNewFollower { get; init; }
}

public sealed record PatchNotificationPreferencesRequest
{
    public bool? NotifyOnParticipantJoined { get; init; }
    public bool? NotifyEventReminder { get; init; }
    public bool? NotifyOnMovieAdded { get; init; }
    public bool? NotifyOnMoviePicked { get; init; }
    public bool? NotifyOnEventDeleted { get; init; }
    public bool? NotifyOnNewFollower { get; init; }
}

public sealed record UserNotificationItem
{
    public string Id { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string? ActorHandle { get; init; }
    public string? ActorDisplayName { get; init; }
    public string? ActorAvatarId { get; init; }
    public string? EventSlug { get; init; }
    public string? EventTitle { get; init; }
    public string? MovieTitle { get; init; }
    public bool IsRead { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record NotificationInboxResponse
{
    public IReadOnlyList<UserNotificationItem> Items { get; init; } = [];
    public int UnreadCount { get; init; }
}

namespace MoviePicker.Api.Application.DTOs;

public sealed record UserDataExportResponse
{
    public DateTimeOffset ExportedAt { get; init; }
    public ExportedProfile Profile { get; init; } = new();
    public IReadOnlyList<ExportedNotification> Notifications { get; init; } = Array.Empty<ExportedNotification>();
    public IReadOnlyList<ExportedConnection> Following { get; init; } = Array.Empty<ExportedConnection>();
    public IReadOnlyList<ExportedConnection> Followers { get; init; } = Array.Empty<ExportedConnection>();
    public IReadOnlyList<ExportedCreatedEvent> CreatedEvents { get; init; } = Array.Empty<ExportedCreatedEvent>();
    public IReadOnlyList<ExportedParticipation> Participations { get; init; } = Array.Empty<ExportedParticipation>();
    public IReadOnlyList<ExportedPushSubscription> PushSubscriptions { get; init; } = Array.Empty<ExportedPushSubscription>();
    public IReadOnlyList<ExportedWatchlistItem> Watchlist { get; init; } = Array.Empty<ExportedWatchlistItem>();
}

public sealed record ExportedProfile
{
    public string UserId { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string Handle { get; init; } = string.Empty;
    public string? Bio { get; init; }
    public bool IsProfilePublic { get; init; }
    public string UiTheme { get; init; } = string.Empty;
    public string AccentColor { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public bool HasPassword { get; init; }
    public IReadOnlyList<string> LinkedProviders { get; init; } = Array.Empty<string>();
    public ExportedNotificationPreferences NotificationPreferences { get; init; } = new();
    public DateTimeOffset? SupporterSince { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public sealed record ExportedNotificationPreferences
{
    public bool ParticipantJoined { get; init; }
    public bool EventReminder { get; init; }
    public bool MovieAdded { get; init; }
    public bool MoviePicked { get; init; }
    public bool EventDeleted { get; init; }
    public bool NewFollower { get; init; }
}

public sealed record ExportedNotification
{
    public string Type { get; init; } = string.Empty;
    public string? ActorHandle { get; init; }
    public string? ActorDisplayName { get; init; }
    public string? EventTitle { get; init; }
    public string? MovieTitle { get; init; }
    public bool IsRead { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedConnection
{
    public string Handle { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
}

public sealed record ExportedCreatedEvent
{
    public string EventId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
}

public sealed record ExportedParticipation
{
    public string EventId { get; init; } = string.Empty;
    public string? EventTitle { get; init; }
    public string Pseudo { get; init; } = string.Empty;
    public DateTimeOffset JoinedAt { get; init; }
    public IReadOnlyList<ExportedVote> Votes { get; init; } = Array.Empty<ExportedVote>();
    public IReadOnlyList<ExportedSeenMark> SeenMarks { get; init; } = Array.Empty<ExportedSeenMark>();
}

public sealed record ExportedVote
{
    public string MovieId { get; init; } = string.Empty;
    public int Value { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedSeenMark
{
    public string MovieId { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedPushSubscription
{
    public string Endpoint { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}

public sealed record ExportedWatchlistItem
{
    public int TmdbId { get; init; }
    public string MediaType { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}

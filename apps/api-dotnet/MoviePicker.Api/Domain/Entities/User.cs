namespace MoviePicker.Api.Domain.Entities;

public enum UiThemePreference
{
    System = 0,
    Light = 1,
    Dark = 2
}

public enum AccentColor
{
    Default = 0,
    Blue = 1,
    Green = 2,
    Purple = 3,
    Pink = 4,
    Orange = 5,
    Red = 6,
    Cyan = 7,
    Indigo = 8
}

public enum RatingScale
{
    Five = 0,
    Ten = 1
}

public sealed record LinkedIdentity
{
    public string Provider { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public DateTimeOffset LinkedAt { get; init; }
}

public sealed record User
{
    public string Id { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PasswordHash { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public IReadOnlyList<LinkedIdentity> Identities { get; init; } = Array.Empty<LinkedIdentity>();
    public string Handle { get; init; } = string.Empty;
    public string? Bio { get; init; }
    public bool IsProfilePublic { get; init; } = true;
    public UiThemePreference UiTheme { get; init; } = UiThemePreference.System;
    public AccentColor AccentColor { get; init; } = AccentColor.Default;
    public RatingScale RatingScale { get; init; } = RatingScale.Five;
    public string AvatarId { get; init; } = string.Empty;
    public IReadOnlyDictionary<UserNotificationType, bool> NotificationPreferences { get; init; }
        = NotificationPreferenceDefaults.All();
    public DateTimeOffset? SupporterSince { get; init; }
    public string? LetterboxdUsername { get; init; }
    public DateTimeOffset? LetterboxdLastSyncAt { get; init; }
    public string? LetterboxdLastSyncError { get; init; }
    public int LetterboxdPendingReconciliationCount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
